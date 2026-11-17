import { File as LocalFile } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import type { ChatMediaItem, MovieSearchResult, CharacterImage } from '../types/chat';
import { fetch } from 'expo/fetch';
import { getAuthTokenKey, getAuthTokenSync } from '@/src/utils/authToken';
import { getSecureItem } from '@/src/utils/storage';
import { consumeChatStream } from './chat-stream';
import { apiBaseUrl } from './client';
import { api } from './client';
import type {ChatStage,ChatFailureCode} from '../types/chat-progress';
import { prepareChatVideo } from '../media/prepare-chat-video';
import { uploadFailure } from './upload-failure';
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
    try {
        const res = method === 'PATCH' ? await api.patch('/api/ai/conversations' + path, body) : method === 'DELETE' ? await api.delete('/api/ai/conversations' + path) : body ? await api.post('/api/ai/conversations' + path, body, { timeout: 75000,signal }) : await api.get('/api/ai/conversations' + path);
        if (!res.data.ok)
            throw new Error('So\'rov bajarilmadi.');
        return res.data.data;
    }
    catch (cause) {
        throw new Error('So\'rov bajarilmadi. Hisobingiz va ulanishni tekshirib, qayta urining.', { cause });
    }
}
export const listChats = () => request<ChatSummary[]>('');
export const createChat = (id: string) => request<SavedConversation>('', { id });
export const getChat = (id: string) => request<SavedConversation>('/' + id);
export async function sendChat(id: string, requestId: string, text: string, onDelta: (text: string) => void = () => { }, media: ChatMediaItem[] = [],onProgress:(stage:ChatStage)=>void=()=>{},options:{signal?:AbortSignal;resume?:boolean;resumeEvent?:{id:string;text:string}}={}): Promise<SavedConversation> {
    const token = getAuthTokenSync() ?? await getSecureItem(getAuthTokenKey());
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
        const file=await prepareChatVideo(new LocalFile(item.uri),options.signal);
        if(!file||file.size>80*1024*1024)throw new Error('Video 80 MB dan oshmasligi kerak.');
        stopped();const bytes=await file.arrayBuffer();
        // Android's native Crypto bridge requires a TypedArray, not a raw ArrayBuffer.
        const digest=await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256,new Uint8Array(bytes));
        const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
        const mimeType=file.uri!==item.uri?'video/mp4':item.mimeType||file.type||(/\.mov$/i.test(item.fileName??'')?'video/quicktime':/\.webm$/i.test(item.fileName??'')?'video/webm':'video/mp4');
        onProgress('upload_video');
        const upload=await request<{url:string;headers:Record<string,string>}>('/'+id+'/video-upload',{requestId,video:{hash,size:file.size,mimeType}},undefined,options.signal)
            .catch(error=>{throw uploadFailure(error,'reservation');});
        // expo/fetch replaces Content-Type with File.type for Blob bodies.
        // Upload the exact bytes we hashed so R2 receives the signed MIME header.
        const uploaded=await fetch(upload.url,{method:'PUT',headers:upload.headers,body:new Uint8Array(bytes),signal:transferSignal(180000)})
            .catch(error=>{throw uploadFailure(error,'transfer');});
        if(!uploaded.ok)throw Object.assign(new Error('Video yuklanmadi.'),{failureCode:'upload_failed'});
        onProgress('checking_video');
    }
    if (localImages.length) {
        onProgress('upload_image');
        const files = await Promise.all(localImages.map(async image => {
            const file = image.file ?? new LocalFile(image.uri);
            const bytes = await file.arrayBuffer();
            const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes));
            const hash = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
            return { bytes, hash, size: bytes.byteLength, mimeType: image.mimeType || file.type || 'image/jpeg' };
        }));
        const uploads = await request<Array<{url:string;headers:Record<string,string>}>>('/' + id + '/uploads', {
            requestId, images: files.map(({hash,size,mimeType})=>({hash,size,mimeType})),
        },undefined,options.signal);
        for (let index=0;index<files.length;index++) {
            stopped();const uploaded = await fetch(uploads[index].url, { method:'PUT', headers:uploads[index].headers,
                body:new Uint8Array(files[index].bytes), signal:transferSignal(60000) });
            if (!uploaded.ok) throw Object.assign(new Error('Rasm yuklanmadi.'),{failureCode:'upload_failed'});
        }
    }
    stopped();
    const body = JSON.stringify({requestId,text,resume:options.resume??false,...(options.resumeEvent?{resumeEvent:{id:options.resumeEvent.id,text:options.resumeEvent.text}}:{}),...(localImages.length ? {directImages:true} : {}),...(localVideos.length?{directVideo:true}:{})});
    const headers: Record<string,string> = {Accept:'text/event-stream',Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const response = await fetch(apiBaseUrl + '/api/ai/conversations/' + id + '/messages', {
        method: 'POST', headers, body, signal: transferSignal(240000),
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
