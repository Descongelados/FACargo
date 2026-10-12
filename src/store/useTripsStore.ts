import { create } from 'zustand';
import { Trip, TripStatus } from '../types';
import { MOCK_TRIPS } from '../data/mockData';

interface TripsState {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, 'id' | 'tripNumber'>) => void;
  updateTrip: (id: string, trip: Partial<Trip>) => void;
  updateTripStatus: (id: string, status: TripStatus) => void;
  deleteTrip: (id: string) => void;
}

export const useTripsStore = create<TripsState>((set) => ({
  trips: MOCK_TRIPS,
  addTrip: (tripData) =>
    set((state) => {
      const count = state.trips.length + 1;
      const tripNumber = `FF-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
      const newTrip: Trip = {
        ...tripData,
        id: `trp-${Date.now()}`,
        tripNumber,
      };
      return { trips: [newTrip, ...state.trips] };
    }),
  updateTrip: (id, updatedData) =>
    set((state) => ({
      trips: state.trips.map((t) => (t.id === id ? { ...t, ...updatedData } : t)),
    })),
  updateTripStatus: (id, status) =>
    set((state) => ({
      trips: state.trips.map((t) => (t.id === id ? { ...t, status } : t)),
    })),
  deleteTrip: (id) =>
    set((state) => ({
      trips: state.trips.filter((t) => t.id !== id),
    })),
}));