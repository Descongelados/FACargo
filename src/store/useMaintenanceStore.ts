import { create } from 'zustand';
import { Maintenance } from '../types';
import { MOCK_MAINTENANCE } from '../data/mockData';

interface MaintenanceState {
  maintenances: Maintenance[];
  addMaintenance: (maintenance: Omit<Maintenance, 'id'>) => void;
  updateMaintenance: (id: string, maintenance: Partial<Maintenance>) => void;
  deleteMaintenance: (id: string) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  maintenances: MOCK_MAINTENANCE,
  addMaintenance: (data) =>
    set((state) => ({
      maintenances: [{ ...data, id: `mnt-${Date.now()}` }, ...state.maintenances],
    })),
  updateMaintenance: (id, updated) =>
    set((state) => ({
      maintenances: state.maintenances.map((m) => (m.id === id ? { ...m, ...updated } : m)),
    })),
  deleteMaintenance: (id) =>
    set((state) => ({
      maintenances: state.maintenances.filter((m) => m.id !== id),
    })),
}));