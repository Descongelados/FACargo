import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Truck, Map, Receipt,
  Wrench, BarChart3, Settings, TruckIcon, ChevronLeft, ChevronRight,
  BookOpen,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { hasPermission } from '../rbac';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',       permission: 'viewDashboard'  as const },
  { to: '/trips',      icon: Map,             label: 'Viajes',          permission: 'manageTrips'    as const },
  { to: '/clients',    icon: Users,           label: 'Clientes',        permission: 'manageClients'  as const },
  { to: '/drivers',    icon: UserCheck,       label: 'Operadores',      permission: 'manageDrivers'  as const },
  { to: '/vehicles',   icon: Truck,           label: 'Unidades',        permission: 'manageVehicles' as const },
  { to: '/expenses',   icon: Receipt,         label: 'Gastos',          permission: 'manageExpenses' as const },
  { to: '/maintenance',icon: Wrench,          label: 'Mantenimientos',  permission: 'manageMaintenance' as const },
  { to: '/accounting', icon: BookOpen,        label: 'Contabilidad',    permission: 'viewAccounting' as const },
  { to: '/reports',    icon: BarChart3,       label: 'Reportes',        permission: 'viewReports'    as const },
  { to: '/settings',   icon: Settings,        label: 'Configuración',   permission: 'manageSettings' as const },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { currentUser } = useAuthStore();
  const { systemName, logoUrl } = useSettingsStore();

  const visibleItems = NAV_ITEMS.filter((item) =>
    currentUser ? hasPermission(currentUser.role, item.permission) : false
  );

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 border-r border-slate-700/50 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-slate-700/50',
        collapsed && 'justify-center px-0'
      )}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded shrink-0" />
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <TruckIcon className="w-5 h-5 text-white" />
          </div>
        )}
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-tight truncate">{systemName}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
                collapsed && 'justify-center px-0'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-slate-700/50">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
