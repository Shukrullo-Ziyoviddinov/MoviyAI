import type { SavedConversation } from './chat';
type StreamResponse = { ok: boolean; body: { getReader: () => { read: () => Promise<{done: boolean; value?: Uint8Array}>; releaseLock: () => void } } | null };
export async function consumeChatStream(response: StreamResponse, onDelta: (text: string) => void): Promise<SavedConversation> {
 if (!response.ok || !response.body) throw new Error('AI javobi olinmadi. Qayta urining.');
 const reader=response.body.getReader(); const decoder=new TextDecoder();
 let buffer=''; let result: SavedConversation | undefined;
 function line(value: string) {
  if(!value.startsWith('data: '))return;
  const event=JSON.parse(value.slice(6));
  if(event.type==='delta' && typeof event.text==='string')onDelta(event.text);
  else if(event.type==='done' && typeof event.data?.id==='string' && Array.isArray(event.data.turns))result=event.data;
  else if(event.type==='error')throw new Error('AI javobi olinmadi. Qayta urining.');
 }
 try {
  while(true){
   const {done,value}=await reader.read();
   buffer+=done ? decoder.decode() : decoder.decode(value,{stream:true});
   const lines=buffer.split('\n');buffer=lines.pop()??'';for(const item of lines)line(item.trimEnd());
   if(done)break;
  }
  if(buffer)line(buffer.trimEnd());
  if(!result)throw new Error('Ulanish uzildi. Qayta urining.');
  return result;
 } finally {reader.releaseLock();}
}
