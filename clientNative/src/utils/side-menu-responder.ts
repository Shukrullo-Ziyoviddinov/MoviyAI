import type { PanResponderCallbacks, PanResponderGestureState } from 'react-native';
type MenuState = {
    open: boolean;
    gesturesSuspended: boolean;
    gestureRevision: number;
    openFromGesture: (revision: number) => void;
    closeMenu: () => void;
};
/** Only intentional horizontal swipes claim a responder; vertical scrolls and taps pass through. */
export function drawerResponder(mode: 'open' | 'close', getState: () => MenuState, drag?: {
    start: () => void;
    move: (dx: number) => void;
    end: (gesture: PanResponderGestureState, valid: boolean) => void;
}): PanResponderCallbacks {
    let revision = -1;
    let active = false;
    const valid = () => {
        const state = getState();
        return !state.gesturesSuspended && revision === state.gestureRevision;
    };
    const eligible = (gesture: PanResponderGestureState) => {
        const state = getState();
        return !state.gesturesSuspended && revision === state.gestureRevision
            && (mode === 'open' ? !state.open && gesture.x0 <= 28 && gesture.dx > 14 : state.open && gesture.dx < -14)
            && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
    };
    const begin = () => { revision = getState().gestureRevision; return false; };
    return {
        onStartShouldSetPanResponder: begin,
        onStartShouldSetPanResponderCapture: begin,
        onMoveShouldSetPanResponder: (_event, gesture) => eligible(gesture),
        onMoveShouldSetPanResponderCapture: (_event, gesture) => eligible(gesture),
        onPanResponderGrant: (_event, gesture) => {
            active = true;
            drag?.start();
            if (valid()) drag?.move(gesture.dx);
        },
        onPanResponderMove: (_event, gesture) => {
            if (active && valid()) drag?.move(gesture.dx);
        },
        onPanResponderRelease: (_event, gesture) => {
            if (drag && active) {
                drag.end(gesture, valid());
            } else if (!drag && eligible(gesture) && (Math.abs(gesture.dx) >= 40 || Math.abs(gesture.vx) >= 0.7)) {
                const state = getState();
                if (mode === 'open')
                    state.openFromGesture(revision);
                else
                    state.closeMenu();
            }
            revision = -1;
            active = false;
        },
        onPanResponderTerminate: (_event, gesture) => {
            if (active) drag?.end(gesture, false);
            active = false;
            revision = -1;
        },
        onPanResponderTerminationRequest: () => true,
    };
}
