/** Remote signed URLs must be preserved byte-for-byte, including their query. */
export function videoPageLocation(uri:string){
 if(/^https:\/\//i.test(uri))return {source:uri,dir:new URL(uri).origin+'/'};
 const clean=uri.split('?')[0],slash=clean.lastIndexOf('/');
 const dir=slash>=0?clean.slice(0,slash+1):'file:///';
 const name=slash>=0?decodeURIComponent(clean.slice(slash+1)):'clip.mp4';
 return {source:encodeURI(name),dir};
}
