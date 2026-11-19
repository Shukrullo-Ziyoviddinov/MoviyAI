import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connect } from 'node:net';
import { createVideoWorkspace } from '../dist/ai/video-import/services/video-workspace.service.js';
import { createVideoProcessor, parseVideoInspection, videoPreparationArguments } from '../dist/ai/video-import/services/video-processor.service.js';
import { createVideoEgress } from '../dist/ai/video-import/services/video-egress.service.js';
import { runVideoProcess } from '../dist/ai/video-import/services/video-process.service.js';
import { videoTools } from '../dist/ai/video-import/config/video-tools.config.js';
import { createVideoDownloader } from '../dist/ai/video-import/services/video-downloader.service.js';
import { VideoProbeError } from '../dist/ai/video-import/types/video-probe.types.js';
import { videoImportPhase } from '../dist/ai/video-import/services/video-import-diagnostics.service.js';

const inspection = (overrides = {}) => ({ duration: 5, size: 1024, width: 640, height: 360, audio: true, videoCodec: 'h264', audioCodec: 'aac', videoIndex: 0, mp4: true, ...overrides });
test('preparation preserves compatible media, remuxes containers and only encodes when necessary', () => {
  assert.equal(videoPreparationArguments('input','output',inspection()), null);
  const remux = videoPreparationArguments('input','output',inspection({mp4:false}));
  assert.equal(remux[remux.indexOf('-c:v')+1], 'copy');
  assert.equal(videoPreparationArguments('input','output',inspection({width:1920,height:1080})),null);
  assert.equal(videoPreparationArguments('input','output',inspection({width:1080,height:1920})),null);
  const resize = videoPreparationArguments('input','output',inspection({width:3840,height:2160}));
  assert.equal(resize[resize.indexOf('-c:v')+1], 'libx264');
  assert.ok(resize.includes('-protocol_whitelist'));
});
test('actual file metadata rejects oversized, long, malformed and cover-only artifacts', () => {
  const valid = { format:{duration:'5',format_name:'mp4'},streams:[{index:0,codec_type:'video',codec_name:'h264',width:640,height:360}] };
  assert.equal(parseVideoInspection(valid,1024,true).mp4,true);
  assert.throws(()=>parseVideoInspection(valid,81*1024*1024,true), {code:'VIDEO_TOO_LARGE'});
  assert.throws(()=>parseVideoInspection({...valid,format:{duration:'181'}},1024,true), {code:'VIDEO_TOO_LONG'});
  assert.throws(()=>parseVideoInspection({streams:[null]},1024,true), {code:'INVALID_ARTIFACT'});
  assert.throws(()=>parseVideoInspection({...valid,streams:[{...valid.streams[0],disposition:{attached_pic:1}}]},1024,true), {code:'INVALID_ARTIFACT'});
});
test('real FFmpeg validates frames, preserves compatible MP4 and resizes a large source', async t => {
  const workspace = await createVideoWorkspace();
  try {
    try { await runVideoProcess(videoTools().ffmpeg,['-version'],{cwd:workspace.directory}); }
    catch(error) { if(error.code==='TOOL_MISSING'){t.skip('FFmpeg not installed');return;} throw error; }
    for (const [size,converted] of [['320x240',false],['1920x1080',false],['2048x1152',true]]) {
      const file = join(workspace.directory,`fixture-${size}.mp4`);
      await runVideoProcess(videoTools().ffmpeg,['-nostdin','-v','error','-f','lavfi','-i',`color=c=blue:s=${size}:d=0.3`,'-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-y',file],{cwd:workspace.directory});
      const result = await createVideoProcessor().prepare(file,workspace.directory,new AbortController().signal);
      assert.equal(result.converted,converted); assert.equal(result.sha256.length,64);
      assert.ok(result.metadata.width<=(converted?1280:1920)); assert.ok(result.metadata.height<=(converted?720:1080));
      assert.ok(result.metadata.durationSeconds>0); await access(result.filePath);
    }
  } finally { await workspace.cleanup(); }
  await assert.rejects(()=>access(workspace.directory),{code:'ENOENT'});
});
test('preparation timeout is bounded and distinct from a transient download timeout',async()=>{
 const workspace=await createVideoWorkspace();let conversionTimeout;
 try{
  const file=join(workspace.directory,'source.mp4'),bytes=Buffer.alloc(64);bytes.write('ftypisom',4);await writeFile(file,bytes);
  const processor=createVideoProcessor({videoTools,runVideoProcess:async(_exe,args,options)=>{
   if(args.includes('-show_format'))return{stdout:JSON.stringify({format:{duration:'10',format_name:'mp4'},streams:[{index:0,codec_type:'video',codec_name:'av1',width:640,height:360}]}),stderr:''};
   conversionTimeout=options.timeoutMs;throw new VideoProbeError('PROCESS_TIMEOUT');
  }});
  await assert.rejects(()=>processor.prepare(file,workspace.directory,new AbortController().signal),{code:'PREPARATION_TIMEOUT'});assert.equal(conversionTimeout,60000);
 }finally{await workspace.cleanup();}
});
test('phase diagnostics preserve safe phase/code/duration without logging raw errors or signed URLs',async()=>{
 const rows=[],info=console.info,warn=console.warn;console.info=(...args)=>rows.push(args);console.warn=(...args)=>rows.push(args);
 const error=Object.assign(Error('https://secret.example/?token=private'),{code:'PREPARATION_TIMEOUT'});
 try{await assert.rejects(()=>videoImportPhase('prepare_format',async()=>{throw error;}),error);}
 finally{console.info=info;console.warn=warn;}
 const text=JSON.stringify(rows);assert.equal(text.includes('secret.example'),false);assert.equal(text.includes('token='),false);
 assert.ok(text.includes('prepare_format'));assert.ok(text.includes('PREPARATION_TIMEOUT'));assert.ok(text.includes('elapsedMs'));
});
test('egress refuses unauthenticated tunnels and private DNS destinations', async () => {
  let connects=0;
  const egress = await createVideoEgress(new AbortController().signal,{
    lookup:async()=>[{address:'127.0.0.1',family:4}],
    connect:()=>{connects++;throw Error('must not connect');},
  });
  const url=new URL(egress.url);
  async function request(auth) {
    return new Promise((resolve,reject)=>{
      const socket=connect(Number(url.port),'127.0.0.1'); let body='';
      socket.on('error',reject);socket.on('data',chunk=>{body+=chunk;});socket.on('close',()=>resolve(body));
      socket.on('connect',()=>socket.write(`CONNECT example.org:443 HTTP/1.1\r\nHost: example.org:443\r\n${auth ? `Proxy-Authorization: Basic ${Buffer.from(`${url.username}:${url.password}`).toString('base64')}\r\n` : ''}\r\n`));
    });
  }
  try {
    assert.match(await request(false),/407/);
    await request(true);
    assert.equal(egress.signal.aborted,true);assert.equal(egress.signal.reason.code,'UNSAFE_ADDRESS');assert.equal(connects,0);
  } finally {await egress.close();}
});
test('consumer owns the artifact until completion; success, failure and stop all clean up', async () => {
  for(const mode of ['success','failure','stop']) {
    let file; let closed=false;
    const controller=new AbortController();
    const downloader=createVideoDownloader({
      createVideoWorkspace,videoTools,
      createVideoEgress:async signal=>({url:'http://test-proxy',signal,close:async()=>{closed=true;}}),
      resolveVideoUrl:async()=>({platform:'instagram',videoId:'fixture',canonicalUrl:'https://www.instagram.com/reel/fixture/',originalUrl:'',kind:'video',needsResolution:false}),
      runVideoProcess:async(_exe,args,options)=>{
        if(args.includes('--dump-single-json'))return{stdout:JSON.stringify({id:'fixture'}),stderr:''};
        file=join(options.cwd,'source.mp4');await writeFile(file,'test-only-artifact');return{stdout:'',stderr:''};
      },
      videoProcessor:{prepare:async filePath=>({filePath,sha256:'a'.repeat(64),converted:false,metadata:{durationSeconds:1,sizeBytes:18,width:1,height:1,mimeType:'video/mp4',hasAudio:false}})},
    });
    const work=downloader.withVideo('fixture',async(video,signal)=>{
      await access(video.filePath);
      if(mode==='failure')throw Error('consumer failed');
      if(mode==='stop'){controller.abort(Error('stopped'));signal.throwIfAborted();}
      return 'uploaded';
    },{signal:controller.signal});
    if(mode==='success')assert.equal(await work,'uploaded');else await assert.rejects(work);
    assert.equal(closed,true);await assert.rejects(()=>access(file),{code:'ENOENT'});
  }
});
