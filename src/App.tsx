import { lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const TripsPage = lazy(() => import('./pages/TripsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const AccountingPage = lazy(() => import('./pages/AccountingPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  const { currentUser, loading, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  // Pantalla de carga mientras se restaura la sesión
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Cargando...</div>
      </div>
    );
  }

  // Sin sesión → mostrar login
  if (!currentUser) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // Con sesión → app completa
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<DashboardPage />} />
        <Route path="/clients"     element={<ClientsPage />} />
        <Route path="/drivers"     element={<DriversPage />} />
        <Route path="/vehicles"    element={<VehiclesPage />} />
        <Route path="/trips"       element={<TripsPage />} />
        <Route path="/expenses"    element={<ExpensesPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/accounting"  element={<AccountingPage />} />
        <Route path="/reports"     element={<ReportsPage />} />
        <Route path="/settings"    element={<SettingsPage />} />
        <Route path="*"            element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
