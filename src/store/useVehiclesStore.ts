import { create } from 'zustand';
import { Vehicle } from '../types';
import { MOCK_VEHICLES } from '../data/mockData';

interface VehiclesState {
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
}

export const useVehiclesStore = create<VehiclesState>((set) => ({
  vehicles: MOCK_VEHICLES,
  addVehicle: (data) =>
    set((state) => ({
      vehicles: [...state.vehicles, { ...data, id: `veh-${Date.now()}` }],
    })),
  updateVehicle: (id, updated) =>
    set((state) => ({
      vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...updated } : v)),
    })),
  deleteVehicle: (id) =>
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== id),
    })),
}));