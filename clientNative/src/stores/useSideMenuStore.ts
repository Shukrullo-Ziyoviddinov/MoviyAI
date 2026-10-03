import { create } from 'zustand';

type SideMenuState = {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

export const useSideMenuStore = create<SideMenuState>((set) => ({
  open: false,
  openMenu: () => set({ open: true }),
  closeMenu: () => set({ open: false }),
  toggleMenu: () => set((state) => ({ open: !state.open })),
}));
