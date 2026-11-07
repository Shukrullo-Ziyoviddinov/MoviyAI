/** Smooth provider chunks without replaying old, restored messages. */
export function createTextReveal(onText: (text:string)=>void, isCurrent: ()=>boolean) {
 const target: string[]=[]; const visible: string[]=[];
 let timer: ReturnType<typeof setTimeout> | undefined;
 let stopped=false;
 const waiting: Array<()=>void>=[];
 const resolve=()=>{while(waiting.length)waiting.shift()?.();};
 function pump() {
  timer=undefined;
  if(stopped || !isCurrent()){stopped=true;resolve();return;}
  visible.push(...target.slice(visible.length,visible.length+4));
  onText(visible.join(''));
  if(visible.length<target.length)timer=setTimeout(pump,16);else resolve();
 }
 return {
  push(text:string){if(stopped)return;target.push(...Array.from(text));if(!timer)timer=setTimeout(pump,16);},
  finish():Promise<void>{if(stopped||visible.length===target.length)return Promise.resolve();return new Promise(resolve=>waiting.push(resolve));},
  cancel(){stopped=true;clearTimeout(timer);resolve();},
 };
}
