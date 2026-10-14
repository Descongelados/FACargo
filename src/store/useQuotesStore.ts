import { create } from 'zustand';
import { Quote, QuoteStatus } from '../types';
import { supabase } from '../lib/supabase';
import { quoteFromDB, quoteToDB , toDBPatch } from '../lib/mappers';

interface QuotesState {
  quotes: Quote[];
  loading: boolean;
  loadQuotes: () => Promise<void>;
  addQuote: (quote: Omit<Quote, 'id' | 'quoteNumber' | 'clientName' | 'vehicleUnit' | 'createdAt'>) => Promise<void>;
  updateQuote: (id: string, quote: Partial<Quote>) => Promise<void>;
  updateQuoteStatus: (id: string, status: QuoteStatus) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
}

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: [],
  loading: false,

  loadQuotes: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('quotes')
      .select('*, clients(name), vehicles(unit_number)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      set({ quotes: data.map(quoteFromDB) });
    }
    set({ loading: false });
  },

  addQuote: async (quoteData) => {
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });
    const quoteNumber = `COT-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`;

    const { data: row, error } = await supabase
      .from('quotes')
      .insert({ ...quoteToDB(quoteData), quote_number: quoteNumber })
      .select('*, clients(name), vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({ quotes: [quoteFromDB(row), ...state.quotes] }));
    }
  },

  updateQuote: async (id, updated) => {
    const { data: row, error } = await supabase
      .from('quotes')
      .update(toDBPatch(updated))
      .eq('id', id)
      .select('*, clients(name), vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({
        quotes: state.quotes.map((q) => (q.id === id ? quoteFromDB(row) : q)),
      }));
    }
  },

  updateQuoteStatus: async (id, status) => {
    const { data: row, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)
      .select('*, clients(name), vehicles(unit_number)')
      .single();
    if (!error && row) {
      set((state) => ({
        quotes: state.quotes.map((q) => (q.id === id ? quoteFromDB(row) : q)),
      }));
    }
  },

  deleteQuote: async (id) => {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (!error) {
      set((state) => ({ quotes: state.quotes.filter((q) => q.id !== id) }));
    }
  },
}));
