import { create } from 'zustand';
import { InsurancePolicy } from '../types';
import { supabase } from '../lib/supabase';
import { insuranceFromDB, insuranceToDB , toDBPatch } from '../lib/mappers';

interface InsuranceState {
  policies: InsurancePolicy[];
  loading: boolean;
  loadPolicies: () => Promise<void>;
  addPolicy: (policy: Omit<InsurancePolicy, 'id' | 'vehicleUnit'>) => Promise<void>;
  updatePolicy: (id: string, policy: Partial<InsurancePolicy>) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
}

export const useInsuranceStore = create<InsuranceState>((set) => ({
  policies: [],
  loading: false,

  loadPolicies: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*, vehicles(unit_number)')
      .order('end_date', { ascending: true });
    if (!error && data) {
      set({ policies: data.map(insuranceFromDB) });
    }
    set({ loading: false });
  },

  addPolicy: async (data) => {
    const { data: row, error } = await supabase
      .from('insurance_policies')
      .insert(insuranceToDB(data))
      .select('*, vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({ policies: [...state.policies, insuranceFromDB(row)] }));
    }
  },

  updatePolicy: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('insurance_policies')
      .update(toDBPatch(updated))
      .eq('id', id)
      .select('*, vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({
        policies: state.policies.map((p) => (p.id === id ? insuranceFromDB(row) : p)),
      }));
    }
  },

  deletePolicy: async (id) => {
    const { error } = await supabase.from('insurance_policies').delete().eq('id', id);
    if (!error) {
      set((state) => ({ policies: state.policies.filter((p) => p.id !== id) }));
    }
  },
}));
