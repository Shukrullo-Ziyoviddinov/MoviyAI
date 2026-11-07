import { fetch } from 'expo/fetch';
import { getAuthTokenKey, getAuthTokenSync } from '@/src/utils/authToken';
import { getSecureItem } from '@/src/utils/storage';
import { consumeChatStream } from './chat-stream';
import { apiBaseUrl } from './client';
import { api } from './client';
export type ChatSummary = {
    pinned: boolean;
    id: string;
    title: string;
    updatedAt: string;
};
export type SavedTurn = {
    requestId: string;
    text: string;
    answer: string;
    status: 'processing' | 'completed' | 'failed';
    createdAt: string;
    model: string;
};
export type SavedConversation = ChatSummary & {
    turns: SavedTurn[];
};
async function request<T>(path: string, body?: unknown, method?: string): Promise<T> {
    try {
        const res = method === 'PATCH' ? await api.patch('/api/ai/conversations' + path, body) : method === 'DELETE' ? await api.delete('/api/ai/conversations' + path) : body ? await api.post('/api/ai/conversations' + path, body, { timeout: 75000 }) : await api.get('/api/ai/conversations' + path);
        if (!res.data.ok)
            throw new Error('So\'rov bajarilmadi.');
        return res.data.data;
    }
    catch {
        throw new Error('So\'rov bajarilmadi. Hisobingiz va ulanishni tekshirib, qayta urining.');
    }
}
export const listChats = () => request<ChatSummary[]>('');
export const createChat = (id: string) => request<SavedConversation>('', { id });
export const getChat = (id: string) => request<SavedConversation>('/' + id);
export async function sendChat(id: string, requestId: string, text: string, onDelta: (text:string)=>void = () => {}): Promise<SavedConversation> {
 const token=getAuthTokenSync() ?? await getSecureItem(getAuthTokenKey());
 if(!token)throw new Error('Hisobingizga kiring.');
 const response=await fetch(apiBaseUrl+'/api/ai/conversations/'+id+'/messages', {
  method:'POST',headers:{'Content-Type':'application/json',Accept:'text/event-stream',Authorization:'Bearer '+token},
  body:JSON.stringify({requestId,text}),signal:AbortSignal.timeout(90000),
 });
 return consumeChatStream(response,onDelta);
}

export const deleteChat = (id: string) => request<{id:string}>('/' + id, undefined, 'DELETE');

export const pinChat = (id:string,pinned:boolean) => request<{id:string;pinned:boolean}>('/'+id+'/pin',{pinned},'PATCH');
