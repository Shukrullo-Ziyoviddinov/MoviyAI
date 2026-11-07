import { createTextReveal } from './text-reveal';
import * as api from '../api/chat';
import type { ChatMessage } from '../types/chat';
type Pending = {
    conversationId: string;
    requestId: string;
    text: string;
};
type State = {
    streamingText: string;
    owner: string | null;
    activeId: string | null;
    conversations: api.ChatSummary[];
    messages: ChatMessage[];
    loading: boolean;
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
    let state: State = { streamingText: '', owner: null, activeId: null, conversations: [], messages: [], loading: false, sending: false, error: null, pending: null };
    const emit = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
    const key = (owner: string) => 'moviy.activeChat.' + owner;
    const remember = async (id: string) => { if (state.owner)
        await storage.write(key(state.owner), id).catch(() => undefined); };
    function apply(chat: api.SavedConversation) {
        const failed = chat.turns.find(turn => turn.status === 'failed');
        emit({ streamingText: '', activeId: chat.id, messages: chat.turns.flatMap(turn => {
                const messages: ChatMessage[] = [{ id: turn.requestId, kind: 'text', role: 'user', text: turn.text, createdAt: Date.parse(turn.createdAt) }];
                if (turn.answer)
                    messages.push({ id: turn.requestId + '-ai', kind: 'text', role: 'model', text: turn.answer, createdAt: Date.parse(turn.createdAt) + 1 });
                return messages;
            }), sending: chat.turns.some(turn => turn.status === 'processing'),
            pending: failed ? { conversationId: chat.id, requestId: failed.requestId, text: failed.text } : null,
            error: failed ? 'Javob olinmadi. Qayta urinib ko\'ring.' : null });
    }
    async function refreshList(version: number) {
        const conversations = await api.listChats();
        if (version === revision)
            emit({ conversations });
    }
    async function openChat(id: string) {
        if (state.sending)
            return;
        const version = ++revision;
        clearTimeout(timer);
        timer = undefined;
        emit({ loading: true, error: null, pending: null });
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
        emit({ streamingText: '', owner, activeId: null, conversations: [], messages: [], loading: !!owner, sending: false, error: null, pending: null });
        if (!owner)
            return;
        try {
            const [conversations, selected] = await Promise.all([api.listChats(), storage.read(key(owner)).catch(() => null)]);
            if (version !== revision)
                return;
            emit({ conversations, loading: false });
            const id = selected === null ? conversations[0]?.id : selected;
            if (id && conversations.some(chat => chat.id === id))
                await openChat(id);
        }
        catch {
            if (version === revision)
                emit({ loading: false, error: 'Suhbatlar yuklanmadi. Sahifani qayta oching.' });
        }
    }
    function newChat() {
        if (state.sending || state.loading)
            return;
        ++revision;
        clearTimeout(timer);
        timer = undefined;
        emit({ streamingText: '', activeId: null, messages: [], pending: null, error: null });
        void remember('');
    }
    async function deliver(payload: Pending) {
        if (state.sending || !state.owner)
            return;
        const version = revision;
        emit({ sending: true, error: null, streamingText: '' });
        const reveal = createTextReveal(text => emit({streamingText:text}), () => version === revision);
        try {
            await remember(payload.conversationId);
            if (version !== revision)
                return;
            await api.createChat(payload.conversationId);
            if (version !== revision)
                return;
            if (!state.conversations.some(chat => chat.id === payload.conversationId))
                emit({ conversations: [{ id: payload.conversationId, title: payload.text.slice(0, 100), updatedAt: new Date().toISOString() }, ...state.conversations] });
            const chat = await api.sendChat(payload.conversationId, payload.requestId, payload.text, delta => reveal.push(delta));
            await reveal.finish();
            if (version !== revision)
                return;
            apply(chat);
            await refreshList(version);
        }
        catch {
            reveal.cancel();
            if (version !== revision) return;
            emit({streamingText:''});
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
        media?: unknown[];
    }) {
        if (state.loading || state.sending || state.pending || state.error)
            return;
        if (!state.owner) {
            emit({ error: 'Hisobingizga kiring.' });
            return;
        }
        if (media.length) {
            emit({ error: 'Rasm/video tahlili keyingi bosqichda ulanadi.' });
            return;
        }
        const value = text?.trim();
        if (!value)
            return;
        const payload = { conversationId: state.activeId ?? storage.uuid(), requestId: storage.uuid(), text: value };
        emit({ activeId: payload.conversationId, pending: payload, messages: [...state.messages, { id: payload.requestId, kind: 'text', role: 'user', text: value, createdAt: Date.now() }] });
        void deliver(payload);
    }
    const actions = { initialize, openChat, newChat, sendMessage, retry: () => { if (state.pending)
            void deliver(state.pending);
        else if (state.activeId)
            void openChat(state.activeId);
        else
            void initialize(state.owner); }, clearMessages: newChat };
    return { subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, getState: () => ({ ...state, ...actions }), getSnapshot: () => state, actions };
}
