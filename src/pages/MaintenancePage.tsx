import { useState, useMemo } from 'react';
import { Wrench, Pencil, Trash2, CheckCircle, Clock, AlertCircle, CalendarClock, ArrowRight } from 'lucide-react';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { Maintenance, MaintenanceType, MaintenanceStatus } from '../types';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../components/ui/FormElements';
import { formatCurrency, formatDate } from '../utils/formatters';
import { requireFields } from '../utils/validate';

const MAINT_STATUS_LABELS: Record<MaintenanceStatus, { label: string; color: string; icon: React.FC<{className?:string}> }> = {
  scheduled: { label: 'Programado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  in_progress: { label: 'En Proceso', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertCircle },
  completed: { label: 'Completado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
};

const MAINT_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventivo',
  corrective: 'Correctivo',
  tire: 'Llantas',
  inspection: 'Inspección',
};

const NEXT_STATUS: Partial<Record<MaintenanceStatus, MaintenanceStatus>> = {
  scheduled:   'in_progress',
  in_progress: 'completed',
};

const NEXT_STATUS_LABEL: Partial<Record<MaintenanceStatus, string>> = {
  scheduled:   'Iniciar',
  in_progress: 'Completar',
};

const EMPTY_MAINT: Omit<Maintenance, 'id'> = {
  vehicleId: '', vehicleUnit: '', type: 'preventive', description: '',
  workshop: '', cost: 0, date: '', status: 'scheduled',
};

export default function MaintenancePage() {
  const { maintenances, addMaintenance, updateMaintenance, deleteMaintenance } = useMaintenanceStore();
  const { vehicles } = useVehiclesStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Maintenance, 'id'>>(EMPTY_MAINT);

  const filtered = maintenances.filter(
    (m) =>
      m.vehicleUnit.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.workshop.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_MAINT); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (m: Maintenance) => {
    const { id, ...rest } = m;
    setForm(rest); setEditingId(id); setIsModalOpen(true);
  };
  const handleSave = () => {
    if (!requireFields({ 'Unidad': form.vehicleId, 'Descripción': form.description, 'Fecha': form.date })) return;
    if (editingId) updateMaintenance(editingId, form);
    else addMaintenance(form);
    setIsModalOpen(false);
  };

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setForm(prev => ({ ...prev, vehicleId, vehicleUnit: vehicle?.unitNumber ?? '' }));
  };

  const f = (key: keyof Omit<Maintenance, 'id'>, val: string | number | undefined) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const totalCost = maintenances.reduce((s, m) => s + m.cost, 0);

  // ─── Vista de próximos mantenimientos cada 6 meses ────────────────────────
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  const ONE_WEEK_MS   = 7 * 24 * 60 * 60 * 1000;

  const scheduleItems = useMemo(() => {
    const now = Date.now();
    return vehicles.map((v) => {
      // último mantenimiento completado de esta unidad
      const completed = maintenances
        .filter((m) => m.vehicleId === v.id && m.status === 'completed' && m.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last = completed[0] ?? null;
      const lastDate = last ? new Date(last.date) : null;
      const nextDate = lastDate ? new Date(lastDate.getTime() + SIX_MONTHS_MS) : null;
      const msLeft   = nextDate ? nextDate.getTime() - now : null;
      return { vehicle: v, lastDate, nextDate, msLeft };
    }).sort((a, b) => (a.msLeft ?? Infinity) - (b.msLeft ?? Infinity));
  }, [vehicles, maintenances]);

  const criticalItems = scheduleItems.filter((i) => i.msLeft! <= ONE_WEEK_MS);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mantenimientos"
        subtitle={`${maintenances.length} registros — Total: ${formatCurrency(totalCost)}`}
        icon={Wrench}
        action={{ label: 'Nuevo Mantenimiento', onClick: openAdd }}
      />

      {/* ── Alerta crítica (≤ 7 días) ── */}
      {criticalItems.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-300 mb-0.5">
              {criticalItems.length === 1
                ? '1 unidad requiere mantenimiento urgente'
                : `${criticalItems.length} unidades requieren mantenimiento urgente`}
            </p>
            <p className="text-xs text-slate-400">
              {criticalItems.map((i) => {
                const days = Math.ceil(i.msLeft! / (24 * 60 * 60 * 1000));
                return days < 0
                  ? `${i.vehicle.unitNumber} (vencido hace ${Math.abs(days)}d)`
                  : `${i.vehicle.unitNumber} (vence en ${days}d)`;
              }).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Panel de próximos mantenimientos (siempre visible) ── */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
          <CalendarClock className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-semibold text-white">Próximos mantenimientos preventivos (6 meses)</p>
          <span className="ml-auto text-xs text-slate-500">{scheduleItems.length} unidad{scheduleItems.length !== 1 ? 'es' : ''}</span>
        </div>
        {scheduleItems.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-500 text-sm">
            <Wrench className="w-4 h-4" />
            Sin unidades registradas
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {scheduleItems.map(({ vehicle, lastDate, nextDate, msLeft }) => {
              const hasNext   = msLeft !== null;
              const days      = hasNext ? Math.ceil(msLeft! / (24 * 60 * 60 * 1000)) : null;
              const isOverdue = days !== null && days < 0;
              const isUrgent  = days !== null && days >= 0 && days <= 7;
              const colorText = !hasNext ? 'text-slate-500' : isOverdue ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-slate-400';
              const colorBg   = !hasNext ? 'bg-slate-700/20 border-slate-600/20' : isOverdue ? 'bg-rose-500/10 border-rose-500/20' : isUrgent ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-700/30 border-slate-600/30';
              return (
                <div key={vehicle.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <Wrench className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-white text-sm">{vehicle.unitNumber}</span>
                  </div>
                  <div className="flex-1 text-xs text-slate-400 hidden sm:block">
                    {vehicle.brand} {vehicle.model} {vehicle.year}
                  </div>
                  <div className="text-xs text-slate-500">
                    Último: <span className="text-slate-300">{lastDate ? lastDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Próximo: <span className="text-slate-300">{nextDate ? nextDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                  </div>
                  {hasNext ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${colorBg} ${colorText} shrink-0`}>
                      {isOverdue
                        ? <><AlertCircle className="w-3 h-3" /> Vencido {Math.abs(days!)}d</>
                        : isUrgent
                        ? <><AlertCircle className="w-3 h-3" /> {days}d restantes</>
                        : <><Clock className="w-3 h-3" /> {days}d restantes</>
                      }
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-slate-700/20 border-slate-600/20 text-slate-500 shrink-0">
                      Sin historial
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por unidad, descripción o taller..." />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="Sin registros" description="Registra el primer mantenimiento." action={{ label: 'Nuevo Mantenimiento', onClick: openAdd }} />
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Unidad', 'Tipo', 'Descripción', 'Taller', 'Fecha', 'Costo', 'Estatus', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((m) => {
                  const s = MAINT_STATUS_LABELS[m.status];
                  return (
                    <tr key={m.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-white">{m.vehicleUnit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-lg">{MAINT_TYPE_LABELS[m.type]}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{m.description}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{m.workshop}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(m.date)}</td>
                      <td className="px-4 py-3 font-semibold text-white">{formatCurrency(m.cost)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge colorClass={s.color} label={s.label} />
                          {NEXT_STATUS[m.status] && (
                            <button
                              onClick={() => updateMaintenance(m.id, { status: NEXT_STATUS[m.status]! })}
                              title={`Avanzar a: ${MAINT_STATUS_LABELS[NEXT_STATUS[m.status]!].label}`}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600 transition-colors"
                            >
                              <ArrowRight className="w-3 h-3" />
                              {NEXT_STATUS_LABEL[m.status]}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteMaintenance(m.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Unidad" required>
            <Select value={form.vehicleId} onChange={(e) => handleVehicleChange(e.target.value)}>
              <option value="">Seleccionar unidad...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.unitNumber} — {v.brand} {v.model}</option>)}
            </Select>
          </FormField>
          <FormField label="Tipo" required>
            <Select value={form.type} onChange={(e) => f('type', e.target.value as MaintenanceType)}>
              {Object.entries(MAINT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
          <FormField label="Descripción" required className="col-span-2">
            <Input value={form.description} onChange={(e) => f('description', e.target.value)} placeholder="Cambio de aceite y filtros..." />
          </FormField>
          <FormField label="Taller">
            <Input value={form.workshop} onChange={(e) => f('workshop', e.target.value)} placeholder="Taller Central" />
          </FormField>
          <FormField label="Costo (MXN)">
            <Input type="number" value={form.cost} onChange={(e) => f('cost', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Fecha" required>
            <Input type="date" value={form.date} onChange={(e) => f('date', e.target.value)} />
          </FormField>
          <FormField label="Estatus">
            <Select value={form.status} onChange={(e) => f('status', e.target.value as MaintenanceStatus)}>
              <option value="scheduled">Programado</option>
              <option value="in_progress">En Proceso</option>
              <option value="completed">Completado</option>
            </Select>
          </FormField>
          <FormField label="Próximo Odómetro (km)">
            <Input type="number" value={form.nextScheduledOdometer ?? ''} onChange={(e) => f('nextScheduledOdometer', +e.target.value)} placeholder="340000" />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            {editingId ? 'Guardar Cambios' : 'Registrar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
