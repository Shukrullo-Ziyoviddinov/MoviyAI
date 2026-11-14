import { useSyncExternalStore } from 'react';
import { randomUUID } from 'expo-crypto';
import { createChatSession } from './chat-session';
import { createNativeChatStorage } from './native-chat-storage';
const storage = createNativeChatStorage(randomUUID);
const session = createChatSession(storage);

type State = ReturnType<typeof session.getState>;
export const useChatStore = Object.assign(function useChatStore<T>(selector: (state: State) => T): T {
    const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
    return selector({ ...state, ...session.actions });
}, { getState: session.getState });
