import { MediaGridBlock } from '@/components/chat/MediaGridBlock';
import { TextMessageBubble } from '@/components/chat/TextMessageBubble';
import { AiWaiting } from '@/components/chat/AiWaiting';
import { AiError } from '@/components/chat/AiError';
import { ChatSkeleton } from '@/components/chat/ChatSkeleton';
import { useChatStore } from '@/src/stores/useChatStore';
import type { ChatMessage } from '@/src/types/chat';
import { useEffect, useRef } from 'react';
import { FlatList, ScrollView, StyleSheet } from 'react-native';

type Props={messages:ChatMessage[];topInset?:number;bottomInset?:number};
export function ChatMessageList({messages,topInset=0,bottomInset=0}:Props){
 const list=useRef<FlatList<ChatMessage>>(null);
 const following=useRef(true);
 const sending=useChatStore(s=>s.sending);
 const error=useChatStore(s=>s.error);
 const retry=useChatStore(s=>s.retry);
 const loading=useChatStore(s=>s.loading);
 const streamingText=useChatStore(s=>s.streamingText);
 const activeId=useChatStore(s=>s.activeId);
 const lastUser=messages.filter(item=>item.kind==='text' && item.role!=='model').at(-1)?.id;
 useEffect(()=>{following.current=true;const frame=requestAnimationFrame(()=>list.current?.scrollToEnd({animated:false}));return()=>cancelAnimationFrame(frame);},[activeId,lastUser,loading]);
 if(loading) return <ScrollView style={styles.list} contentContainerStyle={{paddingTop:topInset+8,paddingBottom:bottomInset}} showsVerticalScrollIndicator={false}><ChatSkeleton/></ScrollView>;
 return <FlatList ref={list} data={messages} keyExtractor={item=>item.id} style={styles.list}
  contentContainerStyle={[styles.content,{paddingTop:topInset+8,paddingBottom:bottomInset}]}
  keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
  scrollEventThrottle={32}
  onScroll={event=>{const {contentSize,contentOffset,layoutMeasurement}=event.nativeEvent;following.current=contentSize.height-contentOffset.y-layoutMeasurement.height<100;}}
  onContentSizeChange={()=>{if(following.current)list.current?.scrollToEnd({animated:false});}}
  ListFooterComponent={sending ? (streamingText ? <TextMessageBubble text={streamingText} role="model"/> : <AiWaiting/>) : error ? <AiError message={error} onRetry={retry} disabled={loading}/> : null}
  renderItem={({item})=>item.kind==='text'?<TextMessageBubble text={item.text} role={item.role}/>:<MediaGridBlock items={item.items}/>}
 />;
}
const styles=StyleSheet.create({list:{flex:1},content:{flexGrow:1,justifyContent:'flex-start'}});
