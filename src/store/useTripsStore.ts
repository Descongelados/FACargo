import { create } from 'zustand';
import { Trip, TripStatus } from '../types';
import { supabase } from '../lib/supabase';
import { tripFromDB, tripToDB , toDBPatch } from '../lib/mappers';

interface TripsState {
  trips: Trip[];
  loading: boolean;
  loadTrips: () => Promise<void>;
  addTrip: (trip: Omit<Trip, 'id' | 'tripNumber' | 'clientName' | 'driverName' | 'vehicleUnit'>) => Promise<void>;
  updateTrip: (id: string, trip: Partial<Trip>) => Promise<void>;
  updateTripStatus: (id: string, status: TripStatus) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
}

export const useTripsStore = create<TripsState>((set) => ({
  trips: [],
  loading: false,

  loadTrips: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('trips')
      .select('*, clients(name), drivers(full_name), vehicles(unit_number)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      set({ trips: data.map(tripFromDB) });
    }
    set({ loading: false });
  },

  addTrip: async (tripData) => {
    // Generar trip_number con conteo actual
    const { count } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true });
    const tripNumber = `FF-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`;

    const { data: row, error } = await supabase
      .from('trips')
      .insert({ ...tripToDB(tripData), trip_number: tripNumber })
      .select('*, clients(name), drivers(full_name), vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({ trips: [tripFromDB(row), ...state.trips] }));
    }
  },

  updateTrip: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('trips')
      .update(toDBPatch(updated))
      .eq('id', id)
      .select('*, clients(name), drivers(full_name), vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({
        trips: state.trips.map((t) => (t.id === id ? tripFromDB(row) : t)),
      }));
    }
  },

  updateTripStatus: async (id, status) => {
    const { data: row, error } = await supabase
      .from('trips')
      .update({ status })
      .eq('id', id)
      .select('*, clients(name), drivers(full_name), vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({
        trips: state.trips.map((t) => (t.id === id ? tripFromDB(row) : t)),
      }));
    }
  },

  deleteTrip: async (id) => {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (!error) {
      set((state) => ({ trips: state.trips.filter((t) => t.id !== id) }));
    }
  },
}));
