import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import DriversPage from './pages/DriversPage';
import VehiclesPage from './pages/VehiclesPage';
import TripsPage from './pages/TripsPage';
import ExpensesPage from './pages/ExpensesPage';
import MaintenancePage from './pages/MaintenancePage';
import AccountingPage from './pages/AccountingPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

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
        <Route path="/users"       element={<UsersPage />} />
        <Route path="/settings"    element={<SettingsPage />} />
        <Route path="*"            element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
