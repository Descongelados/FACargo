import { create } from 'zustand';
import { Client } from '../types';
import { MOCK_CLIENTS } from '../data/mockData';

interface ClientsState {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: MOCK_CLIENTS,
  addClient: (data) =>
    set((state) => ({
      clients: [...state.clients, { ...data, id: `cli-${Date.now()}` }],
    })),
  updateClient: (id, updated) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? { ...c, ...updated } : c)),
    })),
  deleteClient: (id) =>
    set((state) => ({
      clients: state.clients.filter((c) => c.id !== id),
    })),
}));