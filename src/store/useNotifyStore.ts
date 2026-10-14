import { create } from 'zustand';

interface NotifyState {
  message: string | null;
  notifyError: (message: string) => void;
  clear: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useNotifyStore = create<NotifyState>((set) => ({
  message: null,
  notifyError: (message) => {
    set({ message });
    clearTimeout(timer);
    timer = setTimeout(() => set({ message: null }), 8000);
  },
  clear: () => set({ message: null }),
}));
