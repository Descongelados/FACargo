import { create } from 'zustand';
import { AccountingEntry, AccountingPeriod } from '../types';
import { supabase } from '../lib/supabase';
import { periodFromDB, periodToDB, entryFromDB, entryToDB , toDBPatch } from '../lib/mappers';

interface AccountingState {
  periods: AccountingPeriod[];
  entries: AccountingEntry[];
  loading: boolean;
  loadPeriods: () => Promise<void>;
  loadEntries: (periodId: string) => Promise<void>;
  addPeriod: (period: Omit<AccountingPeriod, 'id'>) => Promise<void>;
  closePeriod: (periodId: string, closedBy: string, notes?: string) => Promise<void>;
  reopenPeriod: (periodId: string) => Promise<void>;
  addEntry: (entry: Omit<AccountingEntry, 'id'>) => Promise<void>;
  updateEntry: (id: string, entry: Partial<AccountingEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useAccountingStore = create<AccountingState>((set) => ({
  periods: [],
  entries: [],
  loading: false,

  loadPeriods: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('accounting_periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (!error && data) {
      set({ periods: data.map(periodFromDB) });
    }
    set({ loading: false });
  },

  loadEntries: async (periodId) => {
    const { data, error } = await supabase
      .from('accounting_entries')
      .select('*')
      .eq('period_id', periodId)
      .order('date', { ascending: false });
    if (!error && data) {
      set({ entries: data.map(entryFromDB) });
    }
  },

  addPeriod: async (data) => {
    const id = `per-${data.year}-${String(data.month).padStart(2, '0')}`;
    const { data: row, error } = await supabase
      .from('accounting_periods')
      .insert({ id, ...periodToDB(data) })
      .select()
      .single();
    if (!error && row) {
      set((state) => ({ periods: [periodFromDB(row), ...state.periods] }));
    }
  },

  closePeriod: async (periodId, closedBy, notes) => {
    const { data: row, error } = await supabase
      .from('accounting_periods')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: closedBy,
        notes: notes ?? null,
      })
      .eq('id', periodId)
      .select()
      .single();
    if (!error && row) {
      set((state) => ({
        periods: state.periods.map((p) => (p.id === periodId ? periodFromDB(row) : p)),
      }));
    }
  },

  reopenPeriod: async (periodId) => {
    const { data: row, error } = await supabase
      .from('accounting_periods')
      .update({ status: 'open', closed_at: null, closed_by: null })
      .eq('id', periodId)
      .select()
      .single();
    if (!error && row) {
      set((state) => ({
        periods: state.periods.map((p) => (p.id === periodId ? periodFromDB(row) : p)),
      }));
    }
  },

  addEntry: async (data) => {
    const { data: row, error } = await supabase
      .from('accounting_entries')
      .insert(entryToDB(data))
      .select()
      .single();
    if (!error && row) {
      set((state) => ({ entries: [entryFromDB(row), ...state.entries] }));
    }
  },

  updateEntry: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('accounting_entries')
      .update(toDBPatch(updated))
      .eq('id', id)
      .select()
      .single();
    if (!error && row) {
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? entryFromDB(row) : e)),
      }));
    }
  },

  deleteEntry: async (id) => {
    const { error } = await supabase.from('accounting_entries').delete().eq('id', id);
    if (!error) {
      set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
    }
  },
}));
