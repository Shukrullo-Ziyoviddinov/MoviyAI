import { consumeChatStream } from './chat-stream';
import { apiBaseUrl, readAuthToken } from './client';
export type ChatSummary = {
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
async function request<T>(path: string, body?: unknown): Promise<T> {
    const token = readAuthToken();
    if (!token)
        throw new Error('Hisobingizga kiring.');
    const res = await fetch(apiBaseUrl + '/api/ai/conversations' + path, {
        method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(75000), cache: 'no-store',
    });
    if (!res.ok)
        throw new Error(res.status === 401 ? 'Hisobingizga qayta kiring.' : res.status === 404 ? 'Suhbat topilmadi.' : 'So\'rov bajarilmadi. Qayta urinib ko\'ring.');
    const data = await res.json();
    if (!data.ok)
        throw new Error('So\'rov bajarilmadi.');
    return data.data;
}
export const listChats = () => request<ChatSummary[]>('');
export const createChat = (id: string) => request<SavedConversation>('', { id });
export const getChat = (id: string) => request<SavedConversation>('/' + id);
export async function sendChat(id: string, requestId: string, text: string, onDelta: (text:string)=>void = () => {}): Promise<SavedConversation> {
 const token=readAuthToken(); if(!token)throw new Error('Hisobingizga kiring.');
 const response=await fetch(apiBaseUrl+'/api/ai/conversations/'+id+'/messages', {
  method:'POST',headers:{'Content-Type':'application/json',Accept:'text/event-stream',Authorization:'Bearer '+token},
  body:JSON.stringify({requestId,text}),signal:AbortSignal.timeout(90000),
 });
 return consumeChatStream(response,onDelta);
}
