import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash} from 'node:crypto';

type Context={signal:AbortSignal;checkpoints:Record<string,unknown>;save:(key:string,value:unknown)=>Promise<void>};
const storage=new AsyncLocalStorage<Context>();
export const runChatOperation=<T>(context:Context,work:()=>Promise<T>)=>storage.run(context,work);
export const withoutChatOperation=<T>(work:()=>T)=>storage.exit(work);
export function operationSignal(milliseconds:number):AbortSignal {
 const signal=storage.getStore()?.signal;
 return signal?AbortSignal.any([signal,AbortSignal.timeout(milliseconds)]):AbortSignal.timeout(milliseconds);
}
export function operationCheck(){storage.getStore()?.signal.throwIfAborted();}
export function checkpointKey(scope:string,input:unknown){return createHash('sha256').update(scope+JSON.stringify(input)).digest('hex');}
export async function chatCheckpoint<T>(key:string,work:()=>Promise<T>):Promise<T>{
 const context=storage.getStore();if(!context)return work();
 context.signal.throwIfAborted();
 if(Object.hasOwn(context.checkpoints,key))return structuredClone(context.checkpoints[key]) as T;
 const value=await work();context.signal.throwIfAborted();
 // Only completed plain results are saved. An in-flight provider request restarts.
 if(value!==undefined&&Buffer.byteLength(JSON.stringify(value))<1000000&&Buffer.byteLength(JSON.stringify(context.checkpoints))<4000000){
  await context.save(key,value);context.signal.throwIfAborted();context.checkpoints[key]=structuredClone(value);
 }
 return value;
}
export function isContinueRequest(text:string){
 return /^(?:(?:iltimos|please|yana|endi|ha)\s+)?(?:davom\s*(?:et|ettir|qil)(?:ing|gin)?|davom|continue|resume|продолж(?:и|ить|ай|айте))(?:\s+(?:iltimos|please|дальше))?[.!?\s]*$/iu.test(text.trim());
}
