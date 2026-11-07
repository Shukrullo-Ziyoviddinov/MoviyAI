"use client";

import { useEffect, useRef } from 'react';
import { MediaGridBlock } from '@/components/chat/MediaGridBlock';
import { TextMessageBubble } from '@/components/chat/TextMessageBubble';
import { AiWaiting } from '@/components/chat/AiWaiting';
import { AiError } from '@/components/chat/AiError';
import { useChat } from '@/components/chat/chat-state';

export function ChatMessageList({topInset,bottomInset}:{topInset:number;bottomInset:number}) {
 const {messages,sending,streamingText,activeId,error,retry,loading}=useChat();
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
  scroller.scrollTop=scroller.scrollHeight;
  return()=>{scroller.removeEventListener('scroll',onScroll);scroller.removeEventListener('wheel',onWheel);};
 },[activeId]);
 useEffect(()=>{following.current=true;},[lastUser]);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{const scroller=root.current?.parentElement;if(scroller && following.current)scroller.scrollTop=scroller.scrollHeight;});
  return()=>cancelAnimationFrame(frame);
 },[messages,streamingText,sending,error,bottomInset]);
 return <div ref={root} aria-busy={sending} className="flex min-h-full w-full flex-col justify-end" style={{paddingTop:topInset+8,paddingBottom:bottomInset}}>
  {messages.map(item=>item.kind==='text'?<TextMessageBubble key={item.id} text={item.text} role={item.role}/>:<MediaGridBlock key={item.id} items={item.items}/>)}
  {sending && (streamingText ? <TextMessageBubble text={streamingText} role="model"/> : <AiWaiting/>)}
  {!sending && error && <AiError message={error} onRetry={retry} disabled={loading}/>}
 </div>;
}
