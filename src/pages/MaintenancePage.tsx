import { useState } from 'react';
import { Wrench, Pencil, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mantenimientos"
        subtitle={`${maintenances.length} registros — Total: ${formatCurrency(totalCost)}`}
        icon={Wrench}
        action={{ label: 'Nuevo Mantenimiento', onClick: openAdd }}
      />

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
                        <StatusBadge colorClass={s.color} label={s.label} />
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
          <FormField label="Fecha">
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
