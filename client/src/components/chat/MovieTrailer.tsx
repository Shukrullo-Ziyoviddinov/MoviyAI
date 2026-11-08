"use client";
import {useEffect,useRef,useState} from 'react';
import type {MovieTrailerData} from '@/types/chat';
import {useTheme} from '@/components/theme/theme-state';
import {useT} from '@/i18n/useT';
import {youtubeApi} from './youtube-api';

function TrailerPlayer({trailer}:{trailer:MovieTrailerData}){
 const {colors}=useTheme();const t=useT();const [active,setActive]=useState(false);const [failed,setFailed]=useState(false);
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!active||failed)return;
  let cancelled=false;let player:{destroy:()=>void}|undefined;
  void youtubeApi().then(api=>{
   if(cancelled||!host.current)return;
   const target=document.createElement('div');host.current.replaceChildren(target);
   player=new api.Player(target,{videoId:trailer.videoId,width:'100%',height:'100%',playerVars:{autoplay:1,playsinline:1,rel:0,origin:window.location.origin},events:{
    onError:()=>{if(!cancelled)setFailed(true);},onReady:event=>{event.target.getIframe().referrerPolicy='strict-origin-when-cross-origin';},
   }});
  }).catch(()=>{if(!cancelled)setFailed(true);});
  return()=>{cancelled=true;player?.destroy();};
 },[active,failed,trailer.videoId]);
 const url=`https://www.youtube.com/watch?v=${trailer.videoId}`;
 return <section className="mt-4 w-full min-w-0 max-w-full overflow-hidden rounded-2xl border" style={{backgroundColor:colors.panel,borderColor:colors.borderSoft}}>
  {failed?<p className="px-4 py-5 text-sm" style={{color:colors.textMuted}}>{t('chat.movieVideo.unavailable')}</p>:active?<div ref={host} className="relative aspect-video min-h-[200px] bg-black [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full"/>:
   <button type="button" onClick={()=>setActive(true)} aria-label={t('chat.movieVideo.play')} className="relative block aspect-video min-h-[200px] w-full overflow-hidden bg-black">
    <img src={`https://i.ytimg.com/vi/${trailer.videoId}/hqdefault.jpg`} alt={trailer.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/>
    <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="flex h-14 w-20 items-center justify-center rounded-2xl bg-red-600 text-2xl text-white">▶</span></span>
   </button>}
  <div className="px-4 py-3"><p className="text-xs font-semibold" style={{color:colors.accentBright}}>{t(trailer.kind==='trailer'?'chat.movieVideo.trailer':'chat.movieVideo.related')}</p><p className="mt-1 text-sm font-semibold" style={{color:colors.text}}>{trailer.title}</p>{trailer.channel&&<p className="mt-1 text-xs" style={{color:colors.textMuted}}>{trailer.channel}</p>}</div>
  <a href={url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-sm font-medium" style={{color:colors.accentBright}}>{t('chat.movieVideo.open')} ↗</a>
 </section>;
}
export function MovieTrailer({trailer}:{trailer?:MovieTrailerData|null}){
 return trailer&&/^[\w-]{11}$/.test(trailer.videoId)?<TrailerPlayer key={trailer.videoId} trailer={trailer}/>:null;
}
