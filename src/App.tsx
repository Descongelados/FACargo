import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
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
