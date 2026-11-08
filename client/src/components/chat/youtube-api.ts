type Player = {destroy:()=>void;getIframe:()=>HTMLIFrameElement};
type Api = {Player:new(element:HTMLElement,options:{videoId:string;width:string;height:string;playerVars:Record<string,string|number>;events:{onError:()=>void;onReady:(event:{target:Player})=>void}})=>Player};
declare global {interface Window {YT?:Api}}
let pending:Promise<Api>|undefined;
export function youtubeApi():Promise<Api>{
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(pending)return pending;
 pending=new Promise<Api>((resolve,reject)=>{
  const started=Date.now();
  if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){
   const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;document.head.appendChild(script);
  }
  const poll=()=>{
   if(window.YT?.Player)resolve(window.YT);
   else if(Date.now()-started>10000){pending=undefined;reject(new Error('YouTube player unavailable'));}
   else setTimeout(poll,100);
  };poll();
 });return pending;
}
