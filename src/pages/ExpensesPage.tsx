import { useState } from 'react';
import { Receipt, Trash2, Fuel, ShoppingCart, Utensils, Wrench, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { useExpensesStore } from '../store/useExpensesStore';
import { useTripsStore } from '../store/useTripsStore';
import { Expense, ExpenseCategory } from '../types';
import PageHeader from '../components/ui/PageHeader';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { EXPENSE_CATEGORIES } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';

const CATEGORY_ICONS: Record<ExpenseCategory, React.FC<{ className?: string }>> = {
  fuel: Fuel,
  toll: ShoppingCart,
  viatics: Utensils,
  maintenance: Wrench,
  fine: AlertTriangle,
  other: MoreHorizontal,
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  fuel: 'text-orange-400 bg-orange-500/10',
  toll: 'text-blue-400 bg-blue-500/10',
  viatics: 'text-purple-400 bg-purple-500/10',
  maintenance: 'text-amber-400 bg-amber-500/10',
  fine: 'text-rose-400 bg-rose-500/10',
  other: 'text-slate-400 bg-slate-500/10',
};

const EMPTY_EXPENSE: Omit<Expense, 'id'> = {
  category: 'fuel', description: '', amount: 0, date: '',
  tripId: '', tripNumber: '', vendor: '', invoiceNumber: '',
};

export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense } = useExpensesStore();
  const { trips } = useTripsStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<Expense, 'id'>>(EMPTY_EXPENSE);

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.tripNumber?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (e.vendor?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  const openAdd = () => { setForm(EMPTY_EXPENSE); setIsModalOpen(true); };
  const handleSave = () => { addExpense(form); setIsModalOpen(false); };

  const handleTripChange = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    setForm(prev => ({ ...prev, tripId, tripNumber: trip?.tripNumber ?? '' }));
  };

  const f = (key: keyof Omit<Expense, 'id'>, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gastos Operativos"
        subtitle={`${expenses.length} gastos registrados`}
        icon={Receipt}
        action={{ label: 'Nuevo Gasto', onClick: openAdd }}
      />

      {/* Totales por categoría */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {EXPENSE_CATEGORIES.map(({ value, label }) => {
          const cat = value as ExpenseCategory;
          const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
          const Icon = CATEGORY_ICONS[cat];
          const color = CATEGORY_COLORS[cat];
          return (
            <button
              key={value}
              onClick={() => setCategoryFilter(categoryFilter === value ? 'all' : value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${
                categoryFilter === value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700/50 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-400 text-center leading-tight">{label}</p>
              <p className="text-xs font-semibold text-white">{formatCurrency(total)}</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por descripción, viaje o proveedor..." />
        </div>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700/50 rounded-lg px-3">
          <span className="text-xs text-slate-400">Total filtrado:</span>
          <span className="text-sm font-bold text-white">{formatCurrency(totalFiltered)}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Sin gastos" description="Registra el primer gasto operativo." action={{ label: 'Nuevo Gasto', onClick: openAdd }} />
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Categoría', 'Descripción', 'Viaje', 'Proveedor', 'Fecha', 'Monto', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((e) => {
                  const Icon = CATEGORY_ICONS[e.category];
                  const color = CATEGORY_COLORS[e.category];
                  const catLabel = EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label ?? e.category;
                  return (
                    <tr key={e.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{catLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{e.description}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">{e.tripNumber ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{e.vendor ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 font-semibold text-white">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteExpense(e.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Gasto" size="md">
        <div className="space-y-4">
          <FormField label="Categoría" required>
            <Select value={form.category} onChange={(e) => f('category', e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Descripción" required>
            <Input value={form.description} onChange={(e) => f('description', e.target.value)} placeholder="Recarga diesel 450L..." />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Monto (MXN)" required>
              <Input type="number" value={form.amount} onChange={(e) => f('amount', +e.target.value)} min={0} />
            </FormField>
            <FormField label="Fecha" required>
              <Input type="date" value={form.date} onChange={(e) => f('date', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Viaje Relacionado">
            <Select value={form.tripId ?? ''} onChange={(e) => handleTripChange(e.target.value)}>
              <option value="">Sin viaje asignado</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.tripNumber} — {t.origin} → {t.destination}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Proveedor">
              <Input value={form.vendor ?? ''} onChange={(e) => f('vendor', e.target.value)} placeholder="OXXO Gas, CAPUFE..." />
            </FormField>
            <FormField label="Núm. Factura">
              <Input value={form.invoiceNumber ?? ''} onChange={(e) => f('invoiceNumber', e.target.value)} placeholder="FAC-001" />
            </FormField>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">Registrar Gasto</button>
        </div>
      </Modal>
    </div>
  );
}
