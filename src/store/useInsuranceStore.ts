import { create } from 'zustand';
import { InsurancePolicy } from '../types';

const MOCK_POLICIES: InsurancePolicy[] = [];

interface InsuranceState {
  policies: InsurancePolicy[];
  addPolicy: (policy: Omit<InsurancePolicy, 'id'>) => void;
  updatePolicy: (id: string, policy: Partial<InsurancePolicy>) => void;
  deletePolicy: (id: string) => void;
}

export const useInsuranceStore = create<InsuranceState>((set) => ({
  policies: MOCK_POLICIES,

  addPolicy: (data) =>
    set((state) => ({
      policies: [...state.policies, { ...data, id: `ins-${Date.now()}` }],
    })),

  updatePolicy: (id, updated) =>
    set((state) => ({
      policies: state.policies.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    })),

  deletePolicy: (id) =>
    set((state) => ({
      policies: state.policies.filter((p) => p.id !== id),
    })),
}));
