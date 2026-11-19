import type { ChatMediaItem, MovieSearchResult, CharacterImage } from '../types/chat';
import { consumeChatStream } from './chat-stream';
import { apiBaseUrl, readAuthToken } from './client';
import type {ChatStage,ChatFailureCode} from '../types/chat-progress';
import {prepareChatVideo} from '../media/prepare-chat-video';
export type ChatSummary = {
    pinned: boolean;
    id: string;
    title: string;
    updatedAt: string;
};
export type SavedTurn = {
    answerAt?:string|null;
    resumeEvents?:Array<{id:string;text:string;createdAt:string}>;
    needsAttachment?:boolean;
    progressStage?:ChatStage|null;
    failureCode?:ChatFailureCode|null;
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
    status: 'processing' | 'completed' | 'failed' | 'stopped';
    createdAt: string;
    model: string;
};
export type SavedConversation = ChatSummary & {
    turns: SavedTurn[];
};
async function request<T>(path: string, body?: unknown, method?: string,signal?:AbortSignal): Promise<T> {
    const token = readAuthToken();
    if (!token)
        throw new Error('Hisobingizga kiring.');
    const res = await fetch(apiBaseUrl + '/api/ai/conversations' + path, {
        method: method ?? (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: signal?AbortSignal.any([signal,AbortSignal.timeout(75000)]):AbortSignal.timeout(75000), cache: 'no-store',
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
export async function sendChat(id: string, requestId: string, text: string, onDelta: (text: string) => void = () => { }, media: ChatMediaItem[] = [],onProgress:(stage:ChatStage)=>void=()=>{},options:{signal?:AbortSignal;resume?:boolean;resumeEvent?:{id:string;text:string}}={}): Promise<SavedConversation> {
    const token = readAuthToken();
    if (!token)
        throw new Error('Hisobingizga kiring.');
    const stopped=()=>options.signal?.throwIfAborted();
    const transferSignal=(ms:number)=>options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(ms)]):AbortSignal.timeout(ms);
    stopped();
    const localImages = media.filter(image => image.type==='image'&&!image.stored);
    const localVideos=media.filter(item=>item.type==='video'&&!item.stored);
    if(media.some(item=>item.type==='video')&&media.length!==1)throw new Error('Bitta video yoki rasmlarni alohida yuboring.');
    if(localVideos.length){
        onProgress('preparing_video');
        const item=localVideos[0];
        if(!item.file)throw new Error('Videoni qayta tanlang.');
        const file=await prepareChatVideo(item.file,options.signal);
        stopped();const bytes=await file.arrayBuffer();
        const digest=await crypto.subtle.digest('SHA-256',bytes);
        const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
        const mimeType=file.type||item.mimeType||(/\.mov$/i.test(item.fileName??'')?'video/quicktime':/\.webm$/i.test(item.fileName??'')?'video/webm':'video/mp4');
        const upload=await request<{url:string;headers:Record<string,string>}>('/'+id+'/video-upload',{requestId,video:{hash,size:file.size,mimeType}},undefined,options.signal);
        onProgress('upload_video');
        const uploaded=await fetch(upload.url,{method:'PUT',headers:upload.headers,body:file,signal:transferSignal(180000)});
        if(!uploaded.ok)throw Object.assign(new Error('Video yuklanmadi.'),{failureCode:'upload_failed'});
        onProgress('checking_video');
    }
    if (localImages.length) {
        onProgress('upload_image');
        const files = await Promise.all(localImages.map(async image => {
            const file = image.file;
            if (!file) throw new Error('Rasmni qayta tanlang.');
            const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
            const hash = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
            return { file, hash, size: file.size, mimeType: image.mimeType ?? file.type ?? 'image/jpeg' };
        }));
        const uploads = await request<Array<{url:string;headers:Record<string,string>}>>('/' + id + '/uploads', {
            requestId, images: files.map(({hash,size,mimeType})=>({hash,size,mimeType})),
        },undefined,options.signal);
        for (let index=0;index<files.length;index++) {
            stopped();const uploaded = await fetch(uploads[index].url, { method:'PUT', headers:uploads[index].headers,
                body:files[index].file, signal:transferSignal(60000) });
            if (!uploaded.ok) throw Object.assign(new Error('Rasm yuklanmadi.'),{failureCode:'upload_failed'});
        }
    }
    stopped();
    const body = JSON.stringify({requestId,text,resume:options.resume??false,...(options.resumeEvent?{resumeEvent:{id:options.resumeEvent.id,text:options.resumeEvent.text}}:{}),...(localImages.length ? {directImages:true} : {}),...(localVideos.length?{directVideo:true}:{})});
    const headers: Record<string,string> = {Accept:'text/event-stream',Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const response = await fetch(apiBaseUrl + '/api/ai/conversations/' + id + '/messages', {
        method: 'POST', headers, body, signal: transferSignal(600000),
    });
    return consumeChatStream(response, onDelta,onProgress);
}
export const deleteChat = (id: string) => request<{
    id: string;
}>('/' + id, undefined, 'DELETE');
export const pinChat = (id: string, pinned: boolean) => request<{
    id: string;
    pinned: boolean;
}>('/' + id + '/pin', { pinned }, 'PATCH');
export const chatMediaUrl = (path: string) => path.startsWith('https://') ? path : apiBaseUrl + path;

export const stopChat=(id:string,requestId:string,text:string,attachmentKind?:'image'|'video')=>request<{stopped:boolean}>('/'+id+'/stop',{requestId,text,...(attachmentKind?{attachmentKind}:{})});
