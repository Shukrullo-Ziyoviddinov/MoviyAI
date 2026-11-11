import { createTextReveal } from './text-reveal';
import * as api from '../api/chat';
import type { ChatMessage, ChatMediaItem } from '../types/chat';
type Pending = {
    media?: ChatMediaItem[];
    conversationId: string;
    requestId: string;
    text: string;
};
type State = {
    pinningId: string | null;
    pinError: string | null;
    deletingId: string | null;
    deleteError: string | null;
    streamingText: string;
    owner: string | null;
    activeId: string | null;
    conversations: api.ChatSummary[];
    messages: ChatMessage[];
    loading: boolean;
    listLoading: boolean;
    sending: boolean;
    error: string | null;
    pending: Pending | null;
};
type Storage = {
    read: (key: string) => Promise<string | null>;
    write: (key: string, value: string) => Promise<void>;
    uuid: () => string;
};
export function createChatSession(storage: Storage) {
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listeners = new Set<() => void>();
    let state: State = { listLoading: false, pinningId: null, pinError: null, deletingId: null, deleteError: null, streamingText: '', owner: null, activeId: null, conversations: [], messages: [], loading: false, sending: false, error: null, pending: null };
    const emit = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
    const key = (owner: string) => 'moviy.activeChat.' + owner;
    const remember = async (id: string) => {
        if (state.owner)
            await storage.write(key(state.owner), id).catch(() => undefined);
    };
    function apply(chat: api.SavedConversation) {
        const failed = chat.turns.find(turn => turn.status === 'failed');
        emit({ streamingText: '', activeId: chat.id, messages: chat.turns.flatMap(turn => {
                const messages: ChatMessage[] = [];
                const media = [...(turn.images??[]),...(turn.videos??[])].map(image => ({ id: image.id, type: image.type, uri: api.chatMediaUrl(image.path), stored: true }));
                if (media.length)
                    messages.push({ id: turn.requestId + '-media', kind: 'media', items: media, createdAt: Date.parse(turn.createdAt) });
                if (turn.text)
                    messages.push({ id: turn.requestId, kind: 'text', role: 'user', text: turn.text, createdAt: Date.parse(turn.createdAt) });
                if (turn.answer)
                    messages.push({ id: turn.requestId + '-ai', kind: 'text', role: 'model', text: turn.answer, movie: turn.movie, characterImages: turn.characterImages, createdAt: Date.parse(turn.createdAt) + 1 });
                for(const [index,item] of (turn.recommendations??[]).entries())
                    messages.push({id:turn.requestId+'-recommendation-'+index,kind:'text',role:'model',text:item.text,movie:item.movie,characterImages:item.characterImages,createdAt:Date.parse(turn.createdAt)+index+2});
                return messages;
            }), sending: chat.turns.some(turn => turn.status === 'processing'),
            pending: failed ? { conversationId: chat.id, requestId: failed.requestId, text: failed.text, media: [...(failed.images??[]),...(failed.videos??[])].map(image => ({ id: image.id, type: image.type, uri: api.chatMediaUrl(image.path), stored: true })) } : null,
            error: failed ? 'Javob olinmadi. Qayta urinib ko\'ring.' : null });
    }
    async function refreshList(version: number) {
        if (version !== revision)
            return;
        emit({ listLoading: true });
        try {
            const conversations = await api.listChats();
            if (version === revision)
                emit({ conversations });
        }
        finally {
            if (version === revision)
                emit({ listLoading: false });
        }
    }
    async function openChat(id: string) {
        if (state.sending || state.deletingId || state.pinningId)
            return;
        const version = ++revision;
        clearTimeout(timer);
        timer = undefined;
        emit({ listLoading: false, loading: true, error: null, pending: null });
        try {
            const chat = await api.getChat(id);
            if (version !== revision)
                return;
            apply(chat);
            await remember(id);
            if (state.sending)
                poll(id, version);
        }
        catch {
            if (version === revision)
                emit({ error: 'Suhbatni ochib bo\'lmadi. Qayta tanlang.' });
        }
        finally {
            if (version === revision)
                emit({ loading: false });
        }
    }
    function poll(id: string, version: number) {
        timer = setTimeout(async () => {
            timer = undefined;
            try {
                const chat = await api.getChat(id);
                if (version !== revision)
                    return;
                apply(chat);
                if (state.sending)
                    poll(id, version);
                else
                    await refreshList(version);
            }
            catch {
                if (version === revision) {
                    emit({ sending: false, error: 'Holatni tekshirib bo\'lmadi. Suhbatni qayta oching.' });
                }
            }
        }, 2500);
    }
    async function initialize(owner: string | null) {
        const version = ++revision;
        clearTimeout(timer);
        timer = undefined;
        emit({ pinningId: null, pinError: null, deletingId: null, deleteError: null, streamingText: '', listLoading: !!owner, owner, activeId: null, conversations: [], messages: [], loading: !!owner, sending: false, error: null, pending: null });
        if (!owner)
            return;
        try {
            const [conversations, selected] = await Promise.all([api.listChats(), storage.read(key(owner)).catch(() => null)]);
            if (version !== revision)
                return;
            emit({ conversations, loading: false, listLoading: false });
            const id = selected === null ? conversations[0]?.id : selected;
            if (id && conversations.some(chat => chat.id === id))
                await openChat(id);
        }
        catch {
            if (version === revision)
                emit({ listLoading: false, loading: false, error: 'Suhbatlar yuklanmadi. Sahifani qayta oching.' });
        }
    }
    function newChat() {
        if (state.sending || state.loading || state.deletingId || state.pinningId)
            return;
        ++revision;
        clearTimeout(timer);
        timer = undefined;
        emit({ listLoading: false, streamingText: '', activeId: null, messages: [], pending: null, error: null });
        void remember('');
    }
    async function deliver(payload: Pending) {
        if (state.sending || !state.owner)
            return;
        const version = revision;
        emit({ sending: true, error: null, streamingText: '' });
        const reveal = createTextReveal(text => emit({ streamingText: text }), () => version === revision);
        try {
            await remember(payload.conversationId);
            if (version !== revision)
                return;
            await api.createChat(payload.conversationId);
            if (version !== revision)
                return;
            if (!state.conversations.some(chat => chat.id === payload.conversationId))
                emit({ conversations: [{ id: payload.conversationId, pinned: false, title: payload.text.slice(0, 100), updatedAt: new Date().toISOString() }, ...state.conversations] });
            const chat = await api.sendChat(payload.conversationId, payload.requestId, payload.text, delta => reveal.push(delta), payload.media);
            await reveal.finish();
            if (version !== revision)
                return;
            apply(chat);
            await refreshList(version);
        }
        catch {
            reveal.cancel();
            if (version !== revision)
                return;
            emit({ streamingText: '' });
            try {
                const chat = await api.getChat(payload.conversationId);
                if (version !== revision)
                    return;
                if (chat.turns.some(turn => turn.requestId === payload.requestId)) {
                    apply(chat);
                    if (state.sending)
                        poll(payload.conversationId, version);
                }
            }
            catch { /* The request may not have reached the server; retain the same retry ID. */ }
            if (!state.sending && state.pending)
                emit({ error: 'Javob olinmadi. Qayta urinib ko\'ring.' });
            else if (state.sending && !timer) {
                emit({ sending: false, error: 'Javob olinmadi. Qayta urinib ko\'ring.', pending: payload });
            }
        }
        finally {
            reveal.cancel();
            if (version === revision && !timer)
                emit({ sending: false });
        }
    }
    function sendMessage({ text, media = [] }: {
        text?: string;
        media?: ChatMediaItem[];
    }): boolean {
        if (state.loading || state.sending || state.pending || state.error || state.deletingId || state.pinningId)
            return false;
        if (!state.owner) {
            emit({ error: 'Hisobingizga kiring.' });
            return false;
        }
        const video=media.find(item=>item.type==='video');
        if(video){
            if(media.length!==1||video.fileSize!=null&&video.fileSize>80*1024*1024||video.durationSeconds!=null&&(!Number.isFinite(video.durationSeconds)||video.durationSeconds<=0||video.durationSeconds>180)||video.mimeType&&!['video/mp4','video/quicktime','video/webm'].includes(video.mimeType)){
                emit({error:'Bitta MP4, MOV yoki WebM video yuboring: 3 daqiqa va 80 MB gacha.'});return false;
            }
        }else{
            if(media.some(item=>item.mimeType&&!['image/jpeg','image/png','image/webp'].includes(item.mimeType))){emit({error:'JPEG, PNG yoki WebP rasm yuboring.'});return false;}
            if(media.length>3||media.some(item=>(item.fileSize??0)>4*1024*1024)||media.reduce((sum,item)=>sum+(item.fileSize??0),0)>8*1024*1024){emit({error:'3 tagacha rasm yuboring: har biri 4 MB, jami 8 MB gacha.'});return false;}
        }
        const value = text?.trim() || (media.length ? video?'Videodagi kinoni toping.':'Rasmdagi kinoni toping.' : '');
        if (!value)
            return false;
        const payload = { conversationId: state.activeId ?? storage.uuid(), requestId: storage.uuid(), text: value, media };
        const next: ChatMessage[] = [];
        if (media.length)
            next.push({ id: payload.requestId + '-media', kind: 'media', items: media, createdAt: Date.now() });
        next.push({ id: payload.requestId, kind: 'text', role: 'user', text: value, createdAt: Date.now() });
        emit({ activeId: payload.conversationId, pending: payload, messages: [...state.messages, ...next] });
        void deliver(payload);
        return true;
    }
    async function deleteConversation(id: string): Promise<boolean> {
        if (!state.owner || state.sending || state.loading || state.deletingId || state.pinningId)
            return false;
        const version = revision;
        emit({ deletingId: id, deleteError: null });
        try {
            await api.deleteChat(id);
            if (version !== revision)
                return false;
            const conversations = state.conversations.filter(chat => chat.id !== id);
            if (state.activeId === id) {
                emit({ conversations, activeId: null, messages: [], pending: null, error: null, streamingText: '' });
                await remember('');
            }
            else
                emit({ conversations });
            return true;
        }
        catch {
            if (version === revision)
                emit({ deleteError: id });
            return false;
        }
        finally {
            if (version === revision)
                emit({ deletingId: null });
        }
    }
    async function setPinned(id: string, pinned: boolean): Promise<boolean> {
        if (!state.owner || state.loading || state.deletingId || state.pinningId)
            return false;
        const version = revision;
        emit({ pinningId: id, pinError: null });
        try {
            const result = await api.pinChat(id, pinned);
            if (version !== revision)
                return false;
            emit({ conversations: state.conversations.map(chat => chat.id === id ? { ...chat, pinned: result.pinned } : chat) });
            return true;
        }
        catch {
            if (version === revision)
                emit({ pinError: id });
            return false;
        }
        finally {
            if (version === revision)
                emit({ pinningId: null });
        }
    }
    async function refreshMedia() {
        if (!state.activeId || state.loading || state.sending || state.deletingId) return;
        const images = state.messages.flatMap(message => message.kind === 'media' ? message.items.filter(item=>item.stored) : []);
        const needsRefresh = images.some(image => {
            try {
                const url = new URL(image.uri), stamp = url.searchParams.get('X-Amz-Date');
                if (!stamp) return false;
                const date = Date.UTC(+stamp.slice(0,4),+stamp.slice(4,6)-1,+stamp.slice(6,8),+stamp.slice(9,11),+stamp.slice(11,13),+stamp.slice(13,15));
                return Date.now() >= date + Number(url.searchParams.get('X-Amz-Expires') ?? 3600)*1000 - 300000;
            } catch { return false; }
        });
        if (!needsRefresh) return;
        const version=revision,id=state.activeId;
        try {
            const chat=await api.getChat(id);
            if(version!==revision || state.sending || state.activeId!==id)return;
            const urls=new Map(chat.turns.flatMap(turn=>[...(turn.images??[]),...(turn.videos??[])].map(image=>[image.id,api.chatMediaUrl(image.path)] as const)));
            emit({messages:state.messages.map(message=>message.kind==='media'?{...message,items:message.items.map(item=>urls.has(item.id)?{...item,uri:urls.get(item.id)!}:item)}:message)});
        } catch { /* Retry link renewal on the next interval. */ }
    }
    const actions = { refreshMedia, setPinned, deleteConversation, initialize, openChat, newChat, sendMessage, retry: () => {
            if (state.pending)
                void deliver(state.pending);
            else if (state.activeId)
                void openChat(state.activeId);
            else
                void initialize(state.owner);
        }, clearMessages: newChat };
    return { subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, getState: () => ({ ...state, ...actions }), getSnapshot: () => state, actions };
}
