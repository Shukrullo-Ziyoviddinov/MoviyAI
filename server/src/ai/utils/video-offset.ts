/** Protobuf Duration supports at most nine fractional digits, never a JS float tail/exponent. */
export function videoEndOffset(seconds:number):string{
 if(!Number.isFinite(seconds)||seconds<=0||seconds>180)throw Error('INVALID_VIDEO_DURATION');
 const nanoseconds=Math.floor(seconds*1_000_000_000);
 if(!nanoseconds)throw Error('INVALID_VIDEO_DURATION');
 const whole=Math.floor(nanoseconds/1_000_000_000);
 const fraction=String(nanoseconds%1_000_000_000).padStart(9,'0').replace(/0+$/,'');
 return `${whole}${fraction?'.'+fraction:''}s`;
}
