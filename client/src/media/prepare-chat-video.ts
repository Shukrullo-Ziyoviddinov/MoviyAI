import {AI_VIDEO_MAX_BYTES,VIDEO_INPUT_MAX_BYTES,videoCompressionPlan} from './video-compression-plan';
const prepared=new WeakMap<Blob,Promise<Blob>>();
let aacReady:Promise<void>|undefined;
function failure(code:'compression_unsupported'|'compression_failed'|'video_too_large'|'timeout'):Error{return Object.assign(new Error(code),{failureCode:code});}

/** Local-only conversion. No file bytes are sent to an encoder service. */
async function compress(file:Blob):Promise<Blob>{
 if(!('VideoEncoder'in globalThis)||!('VideoDecoder'in globalThis))throw failure('compression_unsupported');
 const bunny=await import('mediabunny');
 const input=new bunny.Input({source:new bunny.BlobSource(file),formats:bunny.ALL_FORMATS});
 try{
  const video=await input.getPrimaryVideoTrack();if(!video)throw failure('compression_failed');
  const duration=await input.computeDuration(),audio=await input.getPrimaryAudioTrack();
  if(audio){aacReady??=(async()=>{if(!await bunny.canEncodeAudio('aac')){const {registerAacEncoder}=await import('@mediabunny/aac-encoder');registerAacEncoder();}})().catch(error=>{aacReady=undefined;throw error;});await aacReady;}
  for(let attempt=0;attempt<2;attempt++){
   const plan=videoCompressionPlan(duration,video.displayWidth,video.displayHeight,attempt);
   const output=new bunny.Output({format:new bunny.Mp4OutputFormat({fastStart:'in-memory'}),target:new bunny.BufferTarget()});
   const conversion=await bunny.Conversion.init({input,output,
    video:{codec:'avc',width:plan.width,height:plan.height,fit:'contain',frameRate:plan.frameRate,quality:new bunny.Quality({bitrate:plan.videoBitrate,bitrateMode:'variable'}),forceTranscode:true,allowTransformationMetadata:false},
    audio:{codec:'aac',quality:new bunny.Quality({bitrate:plan.audioBitrate}),forceTranscode:true}});
   // Conversion can otherwise succeed by silently dropping an unsupported track.
   if(!conversion.isValid||!conversion.utilizedTracks.includes(video)||audio&&!conversion.utilizedTracks.includes(audio)){await conversion.cancel();throw failure('compression_unsupported');}
   let timedOut=false,oversized=false;
   const timer=setTimeout(()=>{timedOut=true;void conversion.cancel();},300000);
   const stop=output.target.on('write',({end})=>{if(end>AI_VIDEO_MAX_BYTES){oversized=true;void conversion.cancel();}});
   try{await conversion.execute();}catch(error){if(timedOut)throw failure('timeout');if(!oversized)throw error;}finally{clearTimeout(timer);stop();if(conversion.state!=='done')await conversion.cancel();}
   const bytes=output.target.buffer;
   if(!oversized&&bytes&&bytes.byteLength>0&&bytes.byteLength<=AI_VIDEO_MAX_BYTES){
    const result=new Blob([bytes],{type:'video/mp4'});
    const check=new bunny.Input({source:new bunny.BlobSource(result),formats:bunny.ALL_FORMATS});
    try{if(!await check.getPrimaryVideoTrack()||audio&&!await check.getPrimaryAudioTrack()||Math.abs(await check.computeDuration()-duration)>0.5)throw failure('compression_failed');}finally{check.dispose();}
    return result;
   }
  }
  throw failure('video_too_large');
 }catch(error){if((error as {failureCode?:string})?.failureCode)throw error;throw failure('compression_failed');}finally{input.dispose();}
}

export function prepareChatVideo(file:Blob):Promise<Blob>{
 if(!file.size||file.size>VIDEO_INPUT_MAX_BYTES)return Promise.reject(failure('video_too_large'));
 if(file.size<=AI_VIDEO_MAX_BYTES)return Promise.resolve(file);
 let task=prepared.get(file);
 if(!task){task=compress(file).catch(error=>{prepared.delete(file);if(['compression_unsupported','compression_failed','video_too_large','timeout'].includes((error as {failureCode?:string})?.failureCode??''))throw error;throw failure('compression_failed');});prepared.set(file,task);}
 return task;
}
