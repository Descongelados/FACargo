import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_NAME } from '../constants';

interface SettingsState {
  systemName: string;
  logoUrl: string | null;
  setSystemName: (name: string) => void;
  setLogoUrl: (url: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      systemName: APP_NAME,
      logoUrl: null,
      setSystemName: (name: string) => set({ systemName: name.trim() || APP_NAME }),
      setLogoUrl: (url: string | null) => set({ logoUrl: url }),
    }),
    {
      name: 'freightflow-settings',
    }
  )
);
