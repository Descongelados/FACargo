import { create } from 'zustand';
import { Client } from '../types';
import { supabase } from '../lib/supabase';
import { clientFromDB, clientToDB } from '../lib/mappers';

interface ClientsState {
  clients: Client[];
  loading: boolean;
  loadClients: () => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],
  loading: false,

  loadClients: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    if (!error && data) {
      set({ clients: data.map(clientFromDB) });
    }
    set({ loading: false });
  },

  addClient: async (data) => {
    const { data: row, error } = await supabase
      .from('clients')
      .insert(clientToDB(data))
      .select()
      .single();
    if (!error && row) {
      set((state) => ({ clients: [...state.clients, clientFromDB(row)] }));
    }
  },

  updateClient: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('clients')
      .update(updated)
      .eq('id', id)
      .select()
      .single();
    if (!error && row) {
      set((state) => ({
        clients: state.clients.map((c) => (c.id === id ? clientFromDB(row) : c)),
      }));
    }
  },

  deleteClient: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) {
      set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
    }
  },
}));
