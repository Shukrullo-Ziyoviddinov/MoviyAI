import { create } from 'zustand';

type KinoPage = 'catalog' | 'wishlist';

type KinoModalState = {
  wishlist: boolean;
  requestedPage: { page: KinoPage } | null;
  setWishlist: (wishlist: boolean) => void;
  requestPage: (page: KinoPage) => void;
  clearPageRequest: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useKinoModalStore = create<KinoModalState>((set) => ({
  wishlist: false,
  requestedPage: null,
  setWishlist: (wishlist) => set({ wishlist }),
  requestPage: (page) => set({ requestedPage: { page } }),
  clearPageRequest: () => set({ requestedPage: null }),
  open: false,
  setOpen: (open) => set({ open }),
}));
