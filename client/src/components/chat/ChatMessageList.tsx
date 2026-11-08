"use client";

import { useEffect, useRef } from 'react';
import { MediaGridBlock } from '@/components/chat/MediaGridBlock';
import { TextMessageBubble } from '@/components/chat/TextMessageBubble';
import { AiWaiting } from '@/components/chat/AiWaiting';
import { AiError } from '@/components/chat/AiError';
import { ChatSkeleton } from '@/components/chat/ChatSkeleton';
import { useChat } from '@/components/chat/chat-state';

export function ChatMessageList({topInset,bottomInset}:{topInset:number;bottomInset:number}) {
 const {messages,sending,streamingText,activeId,error,retry,loading,refreshMedia}=useChat();
 useEffect(()=>{const timer=setInterval(()=>{void refreshMedia();},60000);return()=>clearInterval(timer);},[refreshMedia]);
 const root=useRef<HTMLDivElement>(null);
 const following=useRef(true);
 const lastUser=messages.filter(item=>item.kind==='text' && item.role!=='model').at(-1)?.id;
 useEffect(()=>{
  const scroller=root.current?.parentElement;
  if(!scroller)return;
  following.current=true;
  const onScroll=()=>{following.current=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<100;};
  const onWheel=(event:WheelEvent)=>{if(event.deltaY<0)following.current=false;};
  scroller.addEventListener('scroll',onScroll,{passive:true});
  scroller.addEventListener('wheel',onWheel,{passive:true});
  scroller.scrollTop=loading ? 0 : scroller.scrollHeight;
  return()=>{scroller.removeEventListener('scroll',onScroll);scroller.removeEventListener('wheel',onWheel);};
 },[activeId,loading]);
 useEffect(()=>{following.current=true;},[lastUser]);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{const scroller=root.current?.parentElement;if(scroller && following.current)scroller.scrollTop=loading ? 0 : scroller.scrollHeight;});
  return()=>cancelAnimationFrame(frame);
 },[messages,streamingText,sending,error,bottomInset,loading]);
 if(loading) return <div ref={root} aria-busy="true" className="min-h-full w-full" style={{paddingTop:topInset+8,paddingBottom:bottomInset}}><ChatSkeleton/></div>;
 return <div ref={root} aria-busy={sending} className="flex min-h-full w-full flex-col justify-start" style={{paddingTop:topInset+8,paddingBottom:bottomInset}}>
  {messages.map(item=>item.kind==='text'?<TextMessageBubble key={item.id} text={item.text} role={item.role} movie={item.movie}/>:<MediaGridBlock key={item.id} items={item.items}/>)}
  {sending && (streamingText ? <TextMessageBubble text={streamingText} role="model"/> : <AiWaiting/>)}
  {!sending && error && <AiError message={error} onRetry={retry} disabled={loading}/>}
 </div>;
}
