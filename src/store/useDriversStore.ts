import { create } from 'zustand';
import { Driver } from '../types';
import { supabase } from '../lib/supabase';
import { driverFromDB, driverToDB , toDBPatch } from '../lib/mappers';

interface DriversState {
  drivers: Driver[];
  loading: boolean;
  loadDrivers: () => Promise<void>;
  addDriver: (driver: Omit<Driver, 'id'>) => Promise<void>;
  updateDriver: (id: string, driver: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
}

export const useDriversStore = create<DriversState>((set) => ({
  drivers: [],
  loading: false,

  loadDrivers: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('full_name');
    if (!error && data) {
      set({ drivers: data.map(driverFromDB) });
    }
    set({ loading: false });
  },

  addDriver: async (data) => {
    const { data: row, error } = await supabase
      .from('drivers')
      .insert(driverToDB(data))
      .select()
      .single();
    if (!error && row) {
      set((state) => ({ drivers: [...state.drivers, driverFromDB(row)] }));
    }
  },

  updateDriver: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('drivers')
      .update(toDBPatch(updated))
      .eq('id', id)
      .select()
      .single();
    if (!error && row) {
      set((state) => ({
        drivers: state.drivers.map((d) => (d.id === id ? driverFromDB(row) : d)),
      }));
    }
  },

  deleteDriver: async (id) => {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (!error) {
      set((state) => ({ drivers: state.drivers.filter((d) => d.id !== id) }));
    }
  },
}));
