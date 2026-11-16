/** Optional enrichment must not hold an already identified movie past its deadline. */
export function optionalBeforeDeadline<T>(work:Promise<T>,signal:AbortSignal,fallback:T):Promise<T> {
  return new Promise(resolve=>{
    let settled=false;
    const finish=(value:T)=>{if(settled)return;settled=true;signal.removeEventListener('abort',aborted);resolve(value);};
    const aborted=()=>finish(fallback);
    work.then(finish,()=>finish(fallback));
    if(signal.aborted)finish(fallback);
    else signal.addEventListener('abort',aborted,{once:true});
  });
}
