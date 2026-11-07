import { useSyncExternalStore } from 'react';
import { randomUUID } from 'expo-crypto';
import { getSecureItem, setSecureItem } from '@/src/utils/storage';
import { createChatSession } from './chat-session';
const session = createChatSession({ read: getSecureItem, write: setSecureItem, uuid: randomUUID });
type State = ReturnType<typeof session.getState>;
export const useChatStore = Object.assign(function useChatStore<T>(selector: (state: State) => T): T {
    const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
    return selector({ ...state, ...session.actions });
}, { getState: session.getState });
