import { createContext } from 'react';
import type { Gesture } from 'react-native-gesture-handler';

// Horizontal content can require the drawer to wait for its own gesture.
export const SideMenuGestureContext = createContext<ReturnType<typeof Gesture.Pan> | null>(null);
