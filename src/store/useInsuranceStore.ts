import { create } from 'zustand';
import { InsurancePolicy } from '../types';

const MOCK_POLICIES: InsurancePolicy[] = [
  {
    id: 'ins-1',
    vehicleId: 'veh-1',
    vehicleUnit: 'TR-101',
    policyNumber: 'GNP-2024-00891',
    insurer: 'GNP Seguros',
    coverage: 'full',
    annualPremium: 48000,
    monthlyPayment: 4200,
    startDate: '2024-01-15',
    endDate: '2025-01-14',
    contactName: 'Lic. Berenice Salazar',
    contactPhone: '+52 55 5227 3900',
    notes: 'Póliza amplia. Carga cubierta hasta $500,000 MXN.',
  },
  {
    id: 'ins-2',
    vehicleId: 'veh-2',
    vehicleUnit: 'TR-102',
    policyNumber: 'AXA-TRK-774-B',
    insurer: 'AXA Seguros',
    coverage: 'damage',
    annualPremium: 36000,
    monthlyPayment: 3100,
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    contactName: 'Ing. Rafael Torres',
    contactPhone: '+52 81 8173 5000',
  },
  {
    id: 'ins-3',
    vehicleId: 'veh-3',
    vehicleUnit: 'TR-103',
    policyNumber: 'HDI-2023-45102',
    insurer: 'HDI Seguros',
    coverage: 'rc',
    annualPremium: 24000,
    startDate: '2023-11-01',
    endDate: '2024-10-31',
    notes: 'Solo responsabilidad civil. Renovación pendiente.',
  },
  {
    id: 'ins-4',
    vehicleId: 'veh-4',
    vehicleUnit: 'TR-104',
    policyNumber: 'QUA-2024-1123',
    insurer: 'Quálitas',
    coverage: 'cargo',
    annualPremium: 31200,
    monthlyPayment: 2700,
    startDate: '2024-02-01',
    endDate: '2025-01-31',
    contactName: 'Carlos Mendoza',
    contactPhone: '+52 55 5354 6030',
    notes: 'Cobertura de mercancía en tránsito hasta $800,000 MXN.',
  },
];

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
