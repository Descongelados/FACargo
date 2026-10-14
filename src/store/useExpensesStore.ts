import { create } from 'zustand';
import { Expense } from '../types';
import { supabase } from '../lib/supabase';
import { expenseFromDB, expenseToDB , toDBPatch } from '../lib/mappers';

interface ExpensesState {
  expenses: Expense[];
  loading: boolean;
  loadExpenses: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'tripNumber'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
  expenses: [],
  loading: false,

  loadExpenses: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('expenses')
      .select('*, trips(trip_number)')
      .order('date', { ascending: false });
    if (!error && data) {
      set({ expenses: data.map(expenseFromDB) });
    }
    set({ loading: false });
  },

  addExpense: async (data) => {
    const { data: row, error } = await supabase
      .from('expenses')
      .insert(expenseToDB(data))
      .select('*, trips(trip_number)')
      .single();
    if (!error && row) {
      set((state) => ({ expenses: [expenseFromDB(row), ...state.expenses] }));
    }
  },

  updateExpense: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('expenses')
      .update(toDBPatch(updated))
      .eq('id', id)
      .select('*, trips(trip_number)')
      .single();
    if (!error && row) {
      set((state) => ({
        expenses: state.expenses.map((e) => (e.id === id ? expenseFromDB(row) : e)),
      }));
    }
  },

  deleteExpense: async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
    }
  },
}));
