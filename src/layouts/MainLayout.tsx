import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import ErrorToast from '../components/ui/ErrorToast';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useClientsStore } from '../store/useClientsStore';
import { useDriversStore } from '../store/useDriversStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { useTripsStore } from '../store/useTripsStore';
import { useQuotesStore } from '../store/useQuotesStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useInsuranceStore } from '../store/useInsuranceStore';
import { useAccountingStore } from '../store/useAccountingStore';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  // Carga inicial de datos desde Supabase al entrar con sesión
  useEffect(() => {
    useClientsStore.getState().loadClients();
    useDriversStore.getState().loadDrivers();
    useVehiclesStore.getState().loadVehicles();
    useTripsStore.getState().loadTrips();
    useQuotesStore.getState().loadQuotes();
    useExpensesStore.getState().loadExpenses();
    useMaintenanceStore.getState().loadMaintenances();
    useInsuranceStore.getState().loadPolicies();
    useAccountingStore.getState().loadPeriods();
  }, []);

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ErrorToast />
    </div>
  );
}
