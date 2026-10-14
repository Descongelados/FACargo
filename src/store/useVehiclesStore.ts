import { create } from 'zustand';
import { Vehicle } from '../types';
import { supabase } from '../lib/supabase';
import { vehicleFromDB, vehicleToDB , toDBPatch } from '../lib/mappers';

interface VehiclesState {
  vehicles: Vehicle[];
  loading: boolean;
  loadVehicles: () => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
}

export const useVehiclesStore = create<VehiclesState>((set) => ({
  vehicles: [],
  loading: false,

  loadVehicles: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('unit_number');
    if (!error && data) {
      set({ vehicles: data.map(vehicleFromDB) });
    }
    set({ loading: false });
  },

  addVehicle: async (data) => {
    const { data: row, error } = await supabase
      .from('vehicles')
      .insert(vehicleToDB(data))
      .select()
      .single();
    if (!error && row) {
      set((state) => ({ vehicles: [...state.vehicles, vehicleFromDB(row)] }));
    }
  },

  updateVehicle: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('vehicles')
      .update(toDBPatch(updated))
      .eq('id', id)
      .select()
      .single();
    if (!error && row) {
      set((state) => ({
        vehicles: state.vehicles.map((v) => (v.id === id ? vehicleFromDB(row) : v)),
      }));
    }
  },

  deleteVehicle: async (id) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) {
      set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) }));
    }
  },
}));
