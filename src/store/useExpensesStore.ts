import { create } from 'zustand';
import { Expense } from '../types';
import { MOCK_EXPENSES } from '../data/mockData';

interface ExpensesState {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
  expenses: MOCK_EXPENSES,
  addExpense: (data) =>
    set((state) => ({
      expenses: [{ ...data, id: `exp-${Date.now()}` }, ...state.expenses],
    })),
  deleteExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    })),
}));