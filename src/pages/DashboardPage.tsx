import { useTripsStore } from '../store/useTripsStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { useDriversStore } from '../store/useDriversStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useClientsStore } from '../store/useClientsStore';
import KpiCard from '../components/ui/KpiCard';
import StatusBadge from '../components/ui/StatusBadge';
import {
  LayoutDashboard, TrendingUp, DollarSign, Truck,
  Map, Users, UserCheck, AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend,
} from 'recharts';
import { TRIP_STATUS_LABELS, VEHICLE_STATUS_LABELS } from '../constants';
import { formatCurrency } from '../utils/formatters';

const MONTHLY_DATA = [
  { mes: 'Oct', ingresos: 320000, gastos: 195000 },
  { mes: 'Nov', ingresos: 285000, gastos: 178000 },
  { mes: 'Dic', ingresos: 410000, gastos: 231000 },
  { mes: 'Ene', ingresos: 375000, gastos: 210000 },
  { mes: 'Feb', ingresos: 395000, gastos: 225000 },
  { mes: 'Mar', ingresos: 448000, gastos: 252000 },
];

export default function DashboardPage() {
  const { trips } = useTripsStore();
  const { vehicles } = useVehiclesStore();
  const { drivers } = useDriversStore();
  const { expenses } = useExpensesStore();
  const { clients } = useClientsStore();

  const totalRevenue = trips.filter(t => t.status === 'delivered').reduce((s, t) => s + t.rate, 0)
    + MONTHLY_DATA.slice(0, 5).reduce((s, d) => s + d.ingresos, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    + MONTHLY_DATA.slice(0, 5).reduce((s, d) => s + d.gastos, 0);
  const activeTrips = trips.filter(t => ['in_transit', 'loading', 'assigned'].includes(t.status)).length;
  const availableVehicles = vehicles.filter(v => v.status === 'available').length;
  const availableDrivers = drivers.filter(d => d.status === 'available').length;
  const recentTrips = [...trips].slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
          <LayoutDashboard className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">Resumen ejecutivo de operaciones</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ingresos Totales"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          iconColor="text-emerald-400"
          trend={{ value: 13.4, label: 'vs mes anterior' }}
        />
        <KpiCard
          title="Gastos Totales"
          value={formatCurrency(totalExpenses)}
          icon={TrendingUp}
          iconColor="text-rose-400"
          trend={{ value: -4.2, label: 'vs mes anterior' }}
        />
        <KpiCard
          title="Viajes Activos"
          value={activeTrips}
          subtitle={`${trips.length} viajes en total`}
          icon={Map}
          iconColor="text-blue-400"
        />
        <KpiCard
          title="Unidades Disponibles"
          value={`${availableVehicles} / ${vehicles.length}`}
          subtitle={`${availableDrivers} operadores libres`}
          icon={Truck}
          iconColor="text-amber-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart ingresos vs gastos */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Ingresos vs Gastos — Últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_DATA}>
              <defs>
                <linearGradient id="ing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(v: number) => [formatCurrency(v), '']}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#3b82f6" fill="url(#ing)" strokeWidth={2} />
              <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#f43f5e" fill="url(#gas)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet status */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Estado de Flotilla</h2>
          <div className="space-y-3">
            {vehicles.map((v) => {
              const s = VEHICLE_STATUS_LABELS[v.status];
              return (
                <div key={v.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{v.unitNumber}</p>
                      <p className="text-xs text-slate-400">{v.brand} {v.model}</p>
                    </div>
                  </div>
                  <StatusBadge colorClass={s.color} label={s.label} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Viajes recientes + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Viajes recientes */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Viajes Recientes</h2>
          <div className="space-y-2">
            {recentTrips.map((trip) => {
              const s = TRIP_STATUS_LABELS[trip.status];
              return (
                <div key={trip.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                  <Map className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{trip.tripNumber}</p>
                      <StatusBadge colorClass={s.color} label={s.label} />
                    </div>
                    <p className="text-xs text-slate-400 truncate">{trip.origin} → {trip.destination}</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-400 shrink-0">{formatCurrency(trip.rate)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Resumen Rápido</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-300">Clientes activos</span>
              </div>
              <span className="font-bold text-white">{clients.filter(c => c.status === 'active').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">Operadores disponibles</span>
              </div>
              <span className="font-bold text-white">{availableDrivers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-300">En mantenimiento</span>
              </div>
              <span className="font-bold text-white">{vehicles.filter(v => v.status === 'maintenance').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">Margen neto aprox.</span>
              </div>
              <span className="font-bold text-emerald-400">
                {totalRevenue > 0 ? `${(((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1)}%` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
