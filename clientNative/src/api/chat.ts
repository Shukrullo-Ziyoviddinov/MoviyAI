import { File as LocalFile } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import type { ChatMediaItem, MovieSearchResult, CharacterImage } from '../types/chat';
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
    videos?:Array<{id:string;type:'video';path:string;duration?:number}>;
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
export async function sendChat(id: string, requestId: string, text: string, onDelta: (text: string) => void = () => { }, media: ChatMediaItem[] = []): Promise<SavedConversation> {
    const token = getAuthTokenSync() ?? await getSecureItem(getAuthTokenKey());
    if (!token)
        throw new Error('Hisobingizga kiring.');
    const localImages = media.filter(image => image.type==='image'&&!image.stored);
    const localVideos=media.filter(item=>item.type==='video'&&!item.stored);
    if(media.some(item=>item.type==='video')&&media.length!==1)throw new Error('Bitta video yoki rasmlarni alohida yuboring.');
    if(localVideos.length){
        const item=localVideos[0];
        const file=item.file??new LocalFile(item.uri);
        if(!file||file.size>80*1024*1024)throw new Error('Video 80 MB dan oshmasligi kerak.');
        const bytes=await file.arrayBuffer();
        const digest=await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256,bytes);
        const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
        const mimeType=item.mimeType||file.type||(/\.mov$/i.test(item.fileName??'')?'video/quicktime':/\.webm$/i.test(item.fileName??'')?'video/webm':'video/mp4');
        const upload=await request<{url:string;headers:Record<string,string>}>('/'+id+'/video-upload',{requestId,video:{hash,size:file.size,mimeType}});
        const uploaded=await fetch(upload.url,{method:'PUT',headers:upload.headers,body:file,signal:AbortSignal.timeout(180000)});
        if(!uploaded.ok)throw new Error('Video yuklanmadi. Qayta urinib koring.');
    }
    if (localImages.length) {
        const files = await Promise.all(localImages.map(async image => {
            const file = image.file ?? new LocalFile(image.uri);
            const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await file.arrayBuffer());
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
    const body = JSON.stringify({requestId,text,...(localImages.length ? {directImages:true} : {}),...(localVideos.length?{directVideo:true}:{})});
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
