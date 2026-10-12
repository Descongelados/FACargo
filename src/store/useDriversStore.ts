import { create } from 'zustand';
import { Driver } from '../types';
import { MOCK_DRIVERS } from '../data/mockData';

interface DriversState {
  drivers: Driver[];
  addDriver: (driver: Omit<Driver, 'id' | 'totalTrips' | 'rating'>) => void;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
}

export const useDriversStore = create<DriversState>((set) => ({
  drivers: MOCK_DRIVERS,
  addDriver: (data) =>
    set((state) => ({
      drivers: [
        ...state.drivers,
        {
          ...data,
          id: `drv-${Date.now()}`,
          rating: 5.0,
          totalTrips: 0,
        },
      ],
    })),
  updateDriver: (id, updated) =>
    set((state) => ({
      drivers: state.drivers.map((d) => (d.id === id ? { ...d, ...updated } : d)),
    })),
  deleteDriver: (id) =>
    set((state) => ({
      drivers: state.drivers.filter((d) => d.id !== id),
    })),
}));