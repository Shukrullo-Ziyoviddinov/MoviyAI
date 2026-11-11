import type { ChatMediaItem, MovieSearchResult, CharacterImage } from '../types/chat';
import { consumeChatStream } from './chat-stream';
import { apiBaseUrl, readAuthToken } from './client';
export type ChatSummary = {
    pinned: boolean;
    id: string;
    title: string;
    updatedAt: string;
};
export type SavedTurn = {
    recommendations?:Array<{text:string;movie:MovieSearchResult;characterImages?:CharacterImage[]}>;
    characterImages?: CharacterImage[];
    images?: Array<{
        id: string;
        type: 'image';
        path: string;
    }>;
    movie?: MovieSearchResult | null;
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
    const token = readAuthToken();
    if (!token)
        throw new Error('Hisobingizga kiring.');
    const res = await fetch(apiBaseUrl + '/api/ai/conversations' + path, {
        method: method ?? (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
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
export async function sendChat(id: string, requestId: string, text: string, onDelta: (text: string) => void = () => { }, media: ChatMediaItem[] = []): Promise<SavedConversation> {
    const token = readAuthToken();
    if (!token)
        throw new Error('Hisobingizga kiring.');
    const localImages = media.filter(image => !image.stored);
    if (localImages.length) {
        const files = await Promise.all(localImages.map(async image => {
            const file = image.file;
            if (!file) throw new Error('Rasmni qayta tanlang.');
            const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
            const hash = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
            return { file, hash, size: file.size, mimeType: image.mimeType ?? file.type ?? 'image/jpeg' };
        }));
        const uploads = await request<Array<{url:string;headers:Record<string,string>}>>('/' + id + '/uploads', {
            requestId, images: files.map(({hash,size,mimeType})=>({hash,size,mimeType})),
        });
        for (let index=0;index<files.length;index++) {
            const uploaded = await fetch(uploads[index].url, { method:'PUT', headers:uploads[index].headers,
                body:files[index].file, signal:AbortSignal.timeout(60000) });
            if (!uploaded.ok) throw new Error('Rasm yuklanmadi. Qayta urinib koring.');
        }
    }
    const body = JSON.stringify({requestId,text,...(localImages.length ? {directImages:true} : {})});
    const headers: Record<string,string> = {Accept:'text/event-stream',Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const response = await fetch(apiBaseUrl + '/api/ai/conversations/' + id + '/messages', {
        method: 'POST', headers, body, signal: AbortSignal.timeout(240000),
    });
    return consumeChatStream(response, onDelta);
}
export const deleteChat = (id: string) => request<{
    id: string;
}>('/' + id, undefined, 'DELETE');
export const pinChat = (id: string, pinned: boolean) => request<{
    id: string;
    pinned: boolean;
}>('/' + id + '/pin', { pinned }, 'PATCH');
export const chatMediaUrl = (path: string) => path.startsWith('https://') ? path : apiBaseUrl + path;
