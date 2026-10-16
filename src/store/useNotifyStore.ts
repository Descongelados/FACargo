import { create } from 'zustand';

type NotifyType = 'error' | 'success';

interface NotifyState {
  message: string | null;
  type: NotifyType;
  notifyError: (message: string) => void;
  notifySuccess: (message: string) => void;
  clear: () => void;
}

// Timer separado por tipo para evitar race condition
let errorTimer: ReturnType<typeof setTimeout> | undefined;
let successTimer: ReturnType<typeof setTimeout> | undefined;

export const useNotifyStore = create<NotifyState>((set) => ({
  message: null,
  type: 'error',
  notifyError: (message) => {
    clearTimeout(errorTimer);
    clearTimeout(successTimer);
    set({ message, type: 'error' });
    errorTimer = setTimeout(() => set({ message: null }), 8000);
  },
  notifySuccess: (message) => {
    clearTimeout(errorTimer);
    clearTimeout(successTimer);
    set({ message, type: 'success' });
    successTimer = setTimeout(() => set({ message: null }), 4000);
  },
  clear: () => {
    clearTimeout(errorTimer);
    clearTimeout(successTimer);
    set({ message: null });
  },
}));
