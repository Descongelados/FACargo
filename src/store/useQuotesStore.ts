import { create } from 'zustand';
import { Quote, QuoteStatus } from '../types';
import { MOCK_QUOTES } from '../data/mockQuotes';

interface QuotesState {
  quotes: Quote[];
  addQuote: (quote: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt'>) => void;
  updateQuote: (id: string, quote: Partial<Quote>) => void;
  updateQuoteStatus: (id: string, status: QuoteStatus) => void;
  deleteQuote: (id: string) => void;
}

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: MOCK_QUOTES,
  addQuote: (data) =>
    set((state) => {
      const count = state.quotes.length + 1;
      const quoteNumber = `COT-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
      const newQuote: Quote = {
        ...data,
        id: `qot-${Date.now()}`,
        quoteNumber,
        createdAt: new Date().toISOString().split('T')[0],
      };
      return { quotes: [newQuote, ...state.quotes] };
    }),
  updateQuote: (id, updated) =>
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...updated } : q)),
    })),
  updateQuoteStatus: (id, status) =>
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? { ...q, status } : q)),
    })),
  deleteQuote: (id) =>
    set((state) => ({
      quotes: state.quotes.filter((q) => q.id !== id),
    })),
}));
