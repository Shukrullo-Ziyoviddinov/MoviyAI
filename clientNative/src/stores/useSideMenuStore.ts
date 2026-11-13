import { create } from 'zustand';

type SideMenuState = {
  open: boolean;
  gesturesSuspended: boolean;
  gestureRevision: number;
  suspendGestures: () => void;
  resumeGestures: () => void;
  openFromGesture: (revision: number) => void;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

export const useSideMenuStore = create<SideMenuState>((set) => ({
  open: false,
  gesturesSuspended: false,
  gestureRevision: 0,
  suspendGestures: () => set(state => ({open:false,gesturesSuspended:true,gestureRevision:state.gestureRevision+1})),
  resumeGestures: () => set(state => ({open:false,gesturesSuspended:false,gestureRevision:state.gestureRevision+1})),
  openFromGesture: revision => set(state => !state.gesturesSuspended && revision===state.gestureRevision ? {open:true} : state),
  openMenu: () => set(state => state.gesturesSuspended ? state : {open:true}),
  closeMenu: () => set({ open: false }),
  toggleMenu: () => set((state) => state.gesturesSuspended ? state : { open: !state.open }),
}));
