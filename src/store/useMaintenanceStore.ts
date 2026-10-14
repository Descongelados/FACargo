import { create } from 'zustand';
import { Maintenance } from '../types';
import { supabase } from '../lib/supabase';
import { maintenanceFromDB, maintenanceToDB } from '../lib/mappers';

interface MaintenanceState {
  maintenances: Maintenance[];
  loading: boolean;
  loadMaintenances: () => Promise<void>;
  addMaintenance: (maintenance: Omit<Maintenance, 'id' | 'vehicleUnit'>) => Promise<void>;
  updateMaintenance: (id: string, maintenance: Partial<Maintenance>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  maintenances: [],
  loading: false,

  loadMaintenances: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('maintenances')
      .select('*, vehicles(unit_number)')
      .order('date', { ascending: false });
    if (!error && data) {
      set({ maintenances: data.map(maintenanceFromDB) });
    }
    set({ loading: false });
  },

  addMaintenance: async (data) => {
    const { data: row, error } = await supabase
      .from('maintenances')
      .insert(maintenanceToDB(data))
      .select('*, vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({ maintenances: [maintenanceFromDB(row), ...state.maintenances] }));
    }
  },

  updateMaintenance: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('maintenances')
      .update(updated)
      .eq('id', id)
      .select('*, vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({
        maintenances: state.maintenances.map((m) => (m.id === id ? maintenanceFromDB(row) : m)),
      }));
    }
  },

  deleteMaintenance: async (id) => {
    const { error } = await supabase.from('maintenances').delete().eq('id', id);
    if (!error) {
      set((state) => ({ maintenances: state.maintenances.filter((m) => m.id !== id) }));
    }
  },
}));
