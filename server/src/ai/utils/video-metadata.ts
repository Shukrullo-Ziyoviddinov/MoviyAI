/** Only container headers are read; media samples are skipped by their atom sizes. */
export async function videoDuration(size:number,mime:string,read:(offset:number,length:number)=>Promise<Buffer>):Promise<number>{
 let duration:number|undefined;
 if(mime==='video/mp4'||mime==='video/quicktime'){
  let count=0;
  async function walk(start:number,end:number,nested=false):Promise<void>{
   for(let at=start;at+8<=end;){
    if(++count>128)throw Error('VIDEO_METADATA_LIMIT');
    const h=await read(at,Math.min(16,end-at));let length=h.readUInt32BE(0),header=8;const type=h.toString('ascii',4,8);
    if(length===1){if(h.length<16)throw Error('INVALID_VIDEO_ATOM');length=Number(h.readBigUInt64BE(8));header=16;}else if(length===0)length=end-at;
    if(!Number.isSafeInteger(length)||length<header||at+length>end)throw Error('INVALID_VIDEO_ATOM');
    if(!nested&&at===0&&type!=='ftyp')throw Error('INVALID_VIDEO_SIGNATURE');
    if(type==='moov')await walk(at+header,at+length,true);
    if(nested&&type==='mvhd'){
     const b=await read(at+header,Math.min(length-header,36));const v=b[0];
     if(v!==0&&v!==1||b.length<(v===1?32:20))throw Error('INVALID_VIDEO_DURATION');
     const scale=b.readUInt32BE(v===1?20:12),ticks=v===1?Number(b.readBigUInt64BE(24)):b.readUInt32BE(16);
     duration=ticks/scale;return;
    }
    if(duration!==undefined)return;at+=length;
   }
  }
  await walk(0,size);
 }else if(mime==='video/webm'){
  const b=await read(0,Math.min(size,65536));if(b.readUInt32BE(0)!==0x1a45dfa3)throw Error('INVALID_VIDEO_SIGNATURE');
  const vint=(at:number,id=false)=>{const first=b[at];if(!first)throw Error('INVALID_WEBM');let n=1,mask=128;while(!(first&mask)&&n<=8){n++;mask>>=1;}if(n>8||at+n>b.length)throw Error('INVALID_WEBM');let value=id?first:first&(mask-1);for(let j=1;j<n;j++)value=value*256+b[at+j];return {n,value,unknown:!id&&value===2**(7*n)-1};};
  let scale=1000000,ticks:number|undefined;
  function walk(start:number,end:number,depth=0){if(depth>3)return;for(let at=start;at<end;){const id=vint(at,true),length=vint(at+id.n),body=at+id.n+length.n;const stop=length.unknown?end:Math.min(end,body+length.value);if(stop<=at)throw Error('INVALID_WEBM');
    if(id.value===0x18538067||id.value===0x1549a966)walk(body,stop,depth+1);
    if(id.value===0x2ad7b1&&length.value<=8){scale=0;for(let j=body;j<stop;j++)scale=scale*256+b[j];}
    if(id.value===0x4489&&stop-body===length.value){if(length.value===4)ticks=b.readFloatBE(body);if(length.value===8)ticks=b.readDoubleBE(body);}
    at=length.unknown?end:body+length.value;
   }}
  walk(0,b.length);if(ticks!==undefined)duration=ticks*scale/1e9;
 }
 if(duration===undefined||!Number.isFinite(duration)||duration<=0)throw Error('VIDEO_DURATION_UNAVAILABLE');return duration;
}
