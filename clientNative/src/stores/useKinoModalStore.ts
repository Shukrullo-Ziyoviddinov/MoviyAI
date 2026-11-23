import { create } from 'zustand';

type KinoModalState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useKinoModalStore = create<KinoModalState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
