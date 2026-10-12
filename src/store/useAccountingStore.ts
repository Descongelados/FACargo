import { create } from 'zustand';
import { AccountingEntry, AccountingPeriod } from '../types';

// ─── Períodos iniciales (últimos 6 meses) ────────────────────────────────────

const INITIAL_PERIODS: AccountingPeriod[] = [];

// ─── Entradas contables de ejemplo ───────────────────────────────────────────

const INITIAL_ENTRIES: AccountingEntry[] = [];

// ─── Store ────────────────────────────────────────────────────────────────────

interface AccountingState {
  periods: AccountingPeriod[];
  entries: AccountingEntry[];
  addPeriod: (period: Omit<AccountingPeriod, 'id'>) => void;
  closePeriod: (periodId: string, closedBy: string, notes?: string) => void;
  reopenPeriod: (periodId: string) => void;
  addEntry: (entry: Omit<AccountingEntry, 'id'>) => void;
  updateEntry: (id: string, entry: Partial<AccountingEntry>) => void;
  deleteEntry: (id: string) => void;
}

export const useAccountingStore = create<AccountingState>((set) => ({
  periods: INITIAL_PERIODS,
  entries: INITIAL_ENTRIES,

  addPeriod: (data) =>
    set((state) => ({
      periods: [
        ...state.periods,
        { ...data, id: `per-${data.year}-${String(data.month).padStart(2, '0')}` },
      ],
    })),

  closePeriod: (periodId, closedBy, notes) =>
    set((state) => ({
      periods: state.periods.map((p) =>
        p.id === periodId
          ? { ...p, status: 'closed' as const, closedAt: new Date().toISOString().split('T')[0], closedBy, notes }
          : p
      ),
    })),

  reopenPeriod: (periodId) =>
    set((state) => ({
      periods: state.periods.map((p) =>
        p.id === periodId
          ? { ...p, status: 'open' as const, closedAt: undefined, closedBy: undefined }
          : p
      ),
    })),

  addEntry: (data) =>
    set((state) => ({
      entries: [{ ...data, id: `ae-${Date.now()}` }, ...state.entries],
    })),

  updateEntry: (id, updated) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...updated } : e)),
    })),

  deleteEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),
}));
