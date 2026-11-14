import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { createChatSession } from './chat-session';
import { createNativeChatStorage } from './native-chat-storage';
import { createChatVisitHandler } from './native-chat-visit';
import { useComposerStore } from './useComposerStore';
import { useSideMenuStore } from './useSideMenuStore';
import { useMediaViewerStore } from './useMediaViewerStore';
const storage = createNativeChatStorage(randomUUID);
const session = createChatSession(storage);

export function useChatAppLifecycle() {
    useEffect(() => {
        const onChange = createChatVisitHandler(() => {
            storage.clear();
            const owner = session.getState().owner;
            if (!owner) return;
            useComposerStore.getState().clearMedia();
            useSideMenuStore.getState().closeMenu();
            useMediaViewerStore.getState().close();
            void session.actions.initialize(owner);
        }, () => useComposerStore.getState().picking);
        const subscription = AppState.addEventListener('change', onChange);
        return () => subscription.remove();
    }, []);
}
type State = ReturnType<typeof session.getState>;
export const useChatStore = Object.assign(function useChatStore<T>(selector: (state: State) => T): T {
    const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
    return selector({ ...state, ...session.actions });
}, { getState: session.getState });
