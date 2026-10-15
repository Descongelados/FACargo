import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_NAME } from '../constants';

interface SettingsState {
  systemName: string;
  setSystemName: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      systemName: APP_NAME,
      setSystemName: (name: string) => set({ systemName: name.trim() || APP_NAME }),
    }),
    {
      name: 'freightflow-settings',
    }
  )
);
