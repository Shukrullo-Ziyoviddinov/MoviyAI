import {request} from 'node:https';
import {isIP} from 'node:net';
import {createPublicImageLookup,isPublicImageAddress,imageFormat} from '../catalog/services/catalog-media.service.js';
import {isPublicHttpsUrl} from '../catalog/validators/catalog.validator.js';

const lookup=createPublicImageLookup();
export function imageDimensions(body:Buffer):{width:number;height:number}|null{
 const format=imageFormat(body);if(!format)return null;
 if(format.mimeType==='image/png'&&body.length>=24&&body.toString('ascii',12,16)==='IHDR')return {width:body.readUInt32BE(16),height:body.readUInt32BE(20)};
 if(format.mimeType==='image/jpeg'){
  let offset=2;
  while(offset+4<=body.length){if(body[offset++]!==255)return null;while(body[offset]===255)offset++;const marker=body[offset++];if(marker===0xda||marker===0xd9)break;if(marker===0x01||marker>=0xd0&&marker<=0xd8)continue;if(offset+2>body.length)break;const size=body.readUInt16BE(offset);if(size<2||offset+size>body.length)break;
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&size>=7)return {width:body.readUInt16BE(offset+5),height:body.readUInt16BE(offset+3)};offset+=size;}
 }
 if(format.mimeType==='image/webp'&&body.length>=30){
  const kind=body.toString('ascii',12,16);
  if(kind==='VP8X')return {width:1+body.readUIntLE(24,3),height:1+body.readUIntLE(27,3)};
  if(kind==='VP8 '&&body.subarray(23,26).equals(Buffer.from([0x9d,0x01,0x2a])))return {width:body.readUInt16LE(26)&0x3fff,height:body.readUInt16LE(28)&0x3fff};
  if(kind==='VP8L'&&body[20]===0x2f){const bits=body.readUInt32LE(21);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}
 }
 return null;
}

/** Probe at most 64 KiB; user uploads still travel directly to R2. Never proxy the complete poster. */
export async function probeMoviePoster(value:string,signal:AbortSignal,redirects=0):Promise<boolean>{
 if(!isPublicHttpsUrl(value)||redirects>3)return false;const url=new URL(value);
 if(isIP(url.hostname)&&!isPublicImageAddress(url.hostname))return false;
 return new Promise(resolve=>{
  let settled=false;const finish=(valid:boolean)=>{if(!settled){settled=true;resolve(valid);}};
  const req=request(url,{method:'GET',agent:false,lookup,signal:AbortSignal.any([signal,AbortSignal.timeout(5000)]),headers:{Range:'bytes=0-65535',Accept:'image/jpeg,image/png,image/webp','Accept-Encoding':'identity'}},res=>{
   if(res.statusCode&&res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.destroy();try{const next=new URL(res.headers.location,url).href;void probeMoviePoster(next,signal,redirects+1).then(finish,()=>finish(false));}catch{finish(false);}return;}
   if(![200,206].includes(res.statusCode??0)||!['image/jpeg','image/png','image/webp','application/octet-stream'].includes(res.headers['content-type']?.split(';')[0].trim()??'')){res.destroy();finish(false);return;}
   const chunks:Buffer[]=[];let size=0;
   const check=()=>{const dimensions=imageDimensions(Buffer.concat(chunks));return !!dimensions&&dimensions.width>=250&&dimensions.height>=350&&dimensions.width<=20000&&dimensions.height<=20000;};
   res.on('data',(chunk:Buffer)=>{const part=chunk.subarray(0,65536-size);chunks.push(part);size+=part.length;if(size>=65536){finish(check());res.destroy();}});
   res.on('end',()=>finish(check()));res.on('error',()=>finish(false));res.on('aborted',()=>finish(false));
  });req.on('error',()=>finish(false));req.end();
 });
}

export async function selectWorkingPosters<T extends {url:string}>(candidates:T[],signal:AbortSignal,probe=probeMoviePoster):Promise<T[]>{
 const result:T[]=[];
 // Two concurrent bounded probes at a time, at most seven candidates.
 const unique=candidates.filter((item,index,all)=>all.findIndex(other=>other.url===item.url)===index).slice(0,7);
 for(let index=0;index<unique.length&&result.length<2&&!signal.aborted;index+=2){const batch=unique.slice(index,index+2);const checks=await Promise.allSettled(batch.map(item=>probe(item.url,signal)));checks.forEach((check,i)=>{if(check.status==='fulfilled'&&check.value&&result.length<2)result.push(batch[i]);});}
 return result;
}
