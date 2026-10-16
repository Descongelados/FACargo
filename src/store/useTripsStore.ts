import { create } from 'zustand';
import { Trip, TripStatus } from '../types';
import { supabase } from '../lib/supabase';
import { tripFromDB, tripToDB , toDBPatch } from '../lib/mappers';
import { useQuotesStore } from './useQuotesStore';

interface TripsState {
  trips: Trip[];
  loading: boolean;
  loadTrips: () => Promise<void>;
  addTrip: (trip: Omit<Trip, 'id' | 'tripNumber' | 'clientName' | 'driverName' | 'vehicleUnit'>) => Promise<void>;
  updateTrip: (id: string, trip: Partial<Trip>) => Promise<void>;
  updateTripStatus: (id: string, status: TripStatus) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
}

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useTripsStore = create<TripsState>((set, get) => ({
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
    const today = getTodayDate();
    const dataToSave = { ...tripData };
    if (dataToSave.status === 'in_transit' && !dataToSave.departureDate) {
      dataToSave.departureDate = today;
    } else if (dataToSave.status === 'delivered') {
      if (!dataToSave.deliveryDate) dataToSave.deliveryDate = today;
      if (!dataToSave.departureDate) dataToSave.departureDate = today;
    }

    // Generar trip_number con conteo actual
    const { count } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true });
    const tripNumber = `FF-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`;

    const { data: row, error } = await supabase
      .from('trips')
      .insert({ ...tripToDB(dataToSave), trip_number: tripNumber })
      .select('*, clients(name), drivers(full_name), vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({ trips: [tripFromDB(row), ...state.trips] }));
    }
  },

  updateTrip: async (id, updated) => {
    const existing = get().trips.find(t => t.id === id);
    const today = getTodayDate();
    const dataToSave = { ...updated };

    if (dataToSave.status === 'in_transit' && !dataToSave.departureDate && !existing?.departureDate) {
      dataToSave.departureDate = today;
    } else if (dataToSave.status === 'delivered') {
      if (!dataToSave.deliveryDate && !existing?.deliveryDate) {
        dataToSave.deliveryDate = today;
      }
      if (!dataToSave.departureDate && !existing?.departureDate) {
        dataToSave.departureDate = today;
      }
    }

    const { data: row, error } = await supabase
      .from('trips')
      .update(toDBPatch(dataToSave))
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
    const existing = get().trips.find(t => t.id === id);
    const today = getTodayDate();
    const patch: Record<string, unknown> = { status };

    if (status === 'in_transit' && !existing?.departureDate) {
      patch.departure_date = today;
    } else if (status === 'delivered') {
      patch.delivery_date = today;
      if (!existing?.departureDate) {
        patch.departure_date = today;
      }
    }

    const { data: row, error } = await supabase
      .from('trips')
      .update(patch)
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
    const target = get().trips.find(t => t.id === id);
    let associatedQuoteId = target?.quoteId;

    if (!associatedQuoteId && target?.notes) {
      const num = target.notes.match(/Generado desde cotización (\S+)/)?.[1];
      if (num) {
        const { data: qRow } = await supabase.from('quotes').select('id').eq('quote_number', num).maybeSingle();
        if (qRow?.id) associatedQuoteId = qRow.id;
      }
    }

    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (!error) {
      set((state) => ({ trips: state.trips.filter((t) => t.id !== id) }));
      if (associatedQuoteId) {
        await supabase.from('quotes').delete().eq('id', associatedQuoteId);
        useQuotesStore.getState().deleteQuote(associatedQuoteId);
      }
    }
  },
}));
