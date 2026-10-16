import { create } from 'zustand';

type NotifyType = 'error' | 'success';

interface NotifyState {
  message: string | null;
  type: NotifyType;
  notifyError: (message: string) => void;
  notifySuccess: (message: string) => void;
  clear: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useNotifyStore = create<NotifyState>((set) => ({
  message: null,
  type: 'error',
  notifyError: (message) => {
    set({ message, type: 'error' });
    clearTimeout(timer);
    timer = setTimeout(() => set({ message: null }), 8000);
  },
  notifySuccess: (message) => {
    set({ message, type: 'success' });
    clearTimeout(timer);
    timer = setTimeout(() => set({ message: null }), 4000);
  },
  clear: () => set({ message: null }),
}));
