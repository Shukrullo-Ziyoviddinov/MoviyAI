// Decimal bytes leave headroom below the provider's external-URL limit.
export const AI_VIDEO_MAX_BYTES=14_000_000;
export const VIDEO_INPUT_MAX_BYTES=80*1024*1024;
export function videoCompressionPlan(duration:number,width:number,height:number,attempt=0){
 if(!Number.isFinite(duration)||duration<=0||duration>180||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('INVALID_VIDEO_METADATA');
 const scale=Math.min(1,(attempt?480:720)/Math.max(width,height));
 return {width:Math.max(2,Math.floor(width*scale/2)*2),height:Math.max(2,Math.floor(height*scale/2)*2),frameRate:24,audioBitrate:64000,
  videoBitrate:Math.floor(Math.max(180000,Math.min(2500000,12_000_000*8/duration-64000))*(attempt?0.65:1))};
}
