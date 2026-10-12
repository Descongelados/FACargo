import { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Truck, UserCheck, Table2 } from 'lucide-react';
import { useTripsStore } from '../store/useTripsStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useDriversStore } from '../store/useDriversStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useInsuranceStore } from '../store/useInsuranceStore';
import PageHeader from '../components/ui/PageHeader';
import { formatCurrency } from '../utils/formatters';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { EXPENSE_CATEGORIES } from '../constants';
import { ExpenseCategory, InsurancePolicy, Trip } from '../types';

const COLORS = ['#3b82f6', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

type ReportTab = 'general' | 'vehicles';

// ─── Helper: costo diario de seguro proporcional al período de operación ──────
// Usa la prima anual de la póliza activa (vehicleId) y los días entre el primer
// y el último viaje de la unidad como proxy del período operado.

function insuranceCostForVehicle(
  vehicleId: string,
  vTrips: Trip[],
  policies: InsurancePolicy[],
): number {
  const policy = policies.find(p => p.vehicleId === vehicleId);
  if (!policy || vTrips.length === 0) return 0;

  const dailyRate = policy.annualPremium / 365;

  // Período operado = desde el primer viaje hasta el último (mínimo 1 día)
  const dates = vTrips
    .map(t => new Date(t.departureDate).getTime())
    .filter(d => !isNaN(d));
  if (dates.length === 0) return 0;

  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const operationDays = Math.max(1, Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);

  return dailyRate * operationDays;
}

// ─── Helper: costo/km por unidad ─────────────────────────────────────────────

function vehicleMetrics(
  vehicleId: string,
  vehicleUnit: string,
  trips: ReturnType<typeof useTripsStore.getState>['trips'],
  expenses: ReturnType<typeof useExpensesStore.getState>['expenses'],
  maintenances: ReturnType<typeof useMaintenanceStore.getState>['maintenances'],
  policies: InsurancePolicy[],
) {
  const vTrips = trips.filter(t => t.vehicleId === vehicleId);
  const totalKm = vTrips.reduce((s, t) => s + (t.distanceKm ?? 0), 0);
  const totalRevenue = vTrips.reduce((s, t) => s + t.rate, 0);
  const tripIds = new Set(vTrips.map(t => t.id));
  const tripExpenses = expenses
    .filter(e => e.tripId && tripIds.has(e.tripId))
    .reduce((s, e) => s + e.amount, 0);
  const maintCost = maintenances
    .filter(m => m.vehicleId === vehicleId)
    .reduce((s, m) => s + m.cost, 0);
  const insuranceCost = insuranceCostForVehicle(vehicleId, vTrips, policies);
  const totalCosts = tripExpenses + maintCost + insuranceCost;
  const costPerKm = totalKm > 0 ? totalCosts / totalKm : 0;
  const revenuePerKm = totalKm > 0 ? totalRevenue / totalKm : 0;
  const profit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  return {
    unit: vehicleUnit, vehicleId,
    trips: vTrips.length,
    totalKm, totalRevenue, totalCosts, tripExpenses, maintCost, insuranceCost,
    costPerKm, revenuePerKm, profit, margin,
  };
}

export default function ReportsPage() {
  const { trips } = useTripsStore();
  const { expenses } = useExpensesStore();
  const { drivers } = useDriversStore();
  const { vehicles } = useVehiclesStore();
  const { maintenances } = useMaintenanceStore();
  const { policies } = useInsuranceStore();

  const [reportTab, setReportTab] = useState<ReportTab>('general');

  // ─── General ───────────────────────────────────────────────────────────────

  const tripProfitability = trips.slice(0, 10).map((t) => {
    const tripExpenses = expenses.filter(e => e.tripId === t.id).reduce((s, e) => s + e.amount, 0);
    const profit = t.rate - tripExpenses;
    return { name: t.tripNumber, ingresos: t.rate, gastos: tripExpenses, utilidad: profit };
  });

  const expensesByCategory = EXPENSE_CATEGORIES.map(({ value, label }) => ({
    name: label,
    value: expenses.filter(e => e.category === (value as ExpenseCategory)).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.value > 0);

  const driverStats = drivers.map((d) => ({
    name: d.fullName.split(' ').slice(0, 2).join(' '),
    viajes: trips.filter(t => t.driverId === d.id).length,
    ingresos: trips.filter(t => t.driverId === d.id).reduce((s, t) => s + t.rate, 0),
    rating: d.rating,
  })).sort((a, b) => b.ingresos - a.ingresos);

  const totalRevenue = trips.reduce((s, t) => s + t.rate, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const avgRate = trips.length > 0 ? totalRevenue / trips.length : 0;

  // ─── Por Unidad ────────────────────────────────────────────────────────────

  const vehicleStats = vehicles.map(v =>
    vehicleMetrics(v.id, v.unitNumber, trips, expenses, maintenances, policies)
  ).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const vehicleBarData = vehicleStats.map(v => ({
    name: v.unit,
    Ingresos: v.totalRevenue,
    Gastos: v.totalCosts,
    Utilidad: v.profit,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes & Analytics"
        subtitle="Análisis financiero y operativo"
        icon={BarChart3}
      />

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700/50 rounded-xl w-fit">
        <button
          onClick={() => setReportTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            reportTab === 'general' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> General
        </button>
        <button
          onClick={() => setReportTab('vehicles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            reportTab === 'vehicles' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" /> Por Unidad
        </button>
      </div>

      {/* ══ GENERAL ═══════════════════════════════════════════════════════════ */}
      {reportTab === 'general' && (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Ingresos Totales', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-emerald-400' },
              { title: 'Gastos Totales', value: formatCurrency(totalExpenses), icon: TrendingUp, color: 'text-rose-400' },
              { title: 'Margen Neto', value: `${totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1) : 0}%`, icon: BarChart3, color: 'text-blue-400' },
              { title: 'Tarifa Promedio', value: formatCurrency(avgRate), icon: Truck, color: 'text-amber-400' },
            ].map(({ title, value, icon: Icon, color }) => (
              <div key={title} className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className="text-xs text-slate-400">{title}</p>
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Rentabilidad por viaje */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Rentabilidad por Viaje (últimos 10)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tripProfitability} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: number) => [formatCurrency(v), '']}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="utilidad" name="Utilidad" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gastos por categoría */}
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Distribución de Gastos</h2>
              {expensesByCategory.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                        {expensesByCategory.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                        formatter={(v: number) => [formatCurrency(v), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {expensesByCategory.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-400">{item.name}</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">Sin gastos registrados</p>
              )}
            </div>

            {/* Desempeño por operador */}
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Desempeño por Operador</h2>
              <div className="space-y-3">
                {driverStats.map((d) => (
                  <div key={d.name} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{d.name}</p>
                      <p className="text-xs text-slate-400">{d.viajes} viajes • Rating: {d.rating.toFixed(1)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-400">{formatCurrency(d.ingresos)}</p>
                      <p className="text-xs text-slate-500">en ingresos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ POR UNIDAD ════════════════════════════════════════════════════════ */}
      {reportTab === 'vehicles' && (
        <>
          {/* KPIs de flotilla */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-slate-400">Unidades activas</p>
              </div>
              <p className="text-xl font-bold text-white">{vehicles.filter(v => v.status !== 'out_of_service').length}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-slate-400">Ingresos flotilla</p>
              </div>
              <p className="text-xl font-bold text-white">{formatCurrency(vehicleStats.reduce((s, v) => s + v.totalRevenue, 0))}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Table2 className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-400">Km totales flotilla</p>
              </div>
              <p className="text-xl font-bold text-white">{vehicleStats.reduce((s, v) => s + v.totalKm, 0).toLocaleString('es-MX')} km</p>
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <p className="text-xs text-slate-400">Costo/km promedio</p>
              </div>
              <p className="text-xl font-bold text-white">
                {(() => {
                  const withData = vehicleStats.filter(v => v.costPerKm > 0);
                  return withData.length > 0
                    ? `$${(withData.reduce((s, v) => s + v.costPerKm, 0) / withData.length).toFixed(2)}`
                    : '—';
                })()}
              </p>
            </div>
          </div>

          {/* Gráfica ingresos vs costos por unidad */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Ingresos vs Costos por Unidad</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={vehicleBarData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: number) => [formatCurrency(v), '']}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Utilidad" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla detallada por unidad */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-slate-300">Detalle por Unidad</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    {[
                      'Unidad', 'Viajes', 'Km Totales', 'Ingresos', 'Gastos Ruta',
                      'Mantenimiento', 'Seguro', 'Costo Total', 'Costo / km', 'Tarifa / km', 'Margen',
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {vehicleStats.map((v) => (
                    <tr key={v.vehicleId} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-white">{v.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{v.trips}</td>
                      <td className="px-4 py-3 text-slate-300">{v.totalKm.toLocaleString('es-MX')}</td>
                      <td className="px-4 py-3 text-emerald-400 font-medium">{formatCurrency(v.totalRevenue)}</td>
                      <td className="px-4 py-3 text-rose-400">{formatCurrency(v.tripExpenses)}</td>
                      <td className="px-4 py-3 text-amber-400">{formatCurrency(v.maintCost)}</td>
                      <td className="px-4 py-3 text-violet-400">
                        {v.insuranceCost > 0 ? formatCurrency(v.insuranceCost) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-rose-400 font-medium">{formatCurrency(v.totalCosts)}</td>
                      <td className="px-4 py-3">
                        {v.costPerKm > 0 ? (
                          <span className={`font-medium ${
                            v.costPerKm < 20 ? 'text-emerald-400' :
                            v.costPerKm < 35 ? 'text-amber-400' : 'text-rose-400'
                          }`}>${v.costPerKm.toFixed(2)}</span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {v.revenuePerKm > 0 ? (
                          <span className="text-blue-400 font-medium">${v.revenuePerKm.toFixed(2)}</span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {v.totalRevenue > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  v.margin >= 30 ? 'bg-emerald-500' :
                                  v.margin >= 10 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.max(0, Math.min(100, v.margin))}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              v.margin >= 30 ? 'text-emerald-400' :
                              v.margin >= 10 ? 'text-amber-400' : 'text-rose-400'
                            }`}>{v.margin.toFixed(1)}%</span>
                          </div>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {vehicleStats.every(v => v.trips === 0) && (
              <div className="text-center py-10 text-slate-500 text-sm">Sin viajes registrados para ninguna unidad</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
