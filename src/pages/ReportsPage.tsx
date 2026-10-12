import { BarChart3, TrendingUp, DollarSign, Truck, UserCheck } from 'lucide-react';
import { useTripsStore } from '../store/useTripsStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useDriversStore } from '../store/useDriversStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import PageHeader from '../components/ui/PageHeader';
import { formatCurrency } from '../utils/formatters';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { EXPENSE_CATEGORIES } from '../constants';
import { ExpenseCategory } from '../types';

const COLORS = ['#3b82f6', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

export default function ReportsPage() {
  const { trips } = useTripsStore();
  const { expenses } = useExpensesStore();
  const { drivers } = useDriversStore();
  const { vehicles } = useVehiclesStore();

  // Rentabilidad por viaje
  const tripProfitability = trips.map((t) => {
    const tripExpenses = expenses.filter(e => e.tripId === t.id).reduce((s, e) => s + e.amount, 0);
    const profit = t.rate - tripExpenses;
    return { name: t.tripNumber, ingresos: t.rate, gastos: tripExpenses, utilidad: profit };
  });

  // Gastos por categoría (pie)
  const expensesByCategory = EXPENSE_CATEGORIES.map(({ value, label }) => ({
    name: label,
    value: expenses.filter(e => e.category === (value as ExpenseCategory)).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.value > 0);

  // Top operadores por viajes
  const driverStats = drivers.map((d) => ({
    name: d.fullName.split(' ').slice(0, 2).join(' '),
    viajes: trips.filter(t => t.driverId === d.id).length,
    ingresos: trips.filter(t => t.driverId === d.id).reduce((s, t) => s + t.rate, 0),
    rating: d.rating,
  }));

  // KPIs generales
  const totalRevenue = trips.reduce((s, t) => s + t.rate, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const delivered = trips.filter(t => t.status === 'delivered').length;
  const avgRate = trips.length > 0 ? totalRevenue / trips.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes & Analytics"
        subtitle="Análisis financiero y operativo"
        icon={BarChart3}
      />

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
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Rentabilidad por Viaje</h2>
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
    </div>
  );
}
