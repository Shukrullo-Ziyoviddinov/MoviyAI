/** Fill absent facts without replacing administrator edits or already verified values. */
export function mergeMissing<T>(current:T,incoming:T):T {
 if(current===null||current===undefined||current==='')return incoming??current;
 if(Array.isArray(current))return (current.length?current:incoming??current) as T;
 if(current&&incoming&&typeof current==='object'&&typeof incoming==='object'&&!Array.isArray(incoming)){
  const merged={...current} as Record<string,unknown>;
  for(const [key,value] of Object.entries(incoming))merged[key]=mergeMissing(merged[key],value);
  return merged as T;
 }
 return current;
}
export function missingValuePaths(value:unknown,path=''):string[]{
 if(value===null||value===undefined||Array.isArray(value)&&!value.length)return [path];
 if(value&&typeof value==='object'&&!Array.isArray(value))return Object.entries(value).flatMap(([key,item])=>missingValuePaths(item,path?`${path}.${key}`:key));
 return [];
}
/** Strip database metadata recursively before applying the strict catalogue schema. */
export function projectLike(template:unknown,value:unknown):unknown{
 if(Array.isArray(template)||!template||typeof template!=='object')return value;
 const row=value&&typeof value==='object'?value as Record<string,unknown>:{};
 return Object.fromEntries(Object.entries(template).map(([key,shape])=>[key,projectLike(shape,row[key])]));
}
