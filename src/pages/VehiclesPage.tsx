import { useState } from 'react';
import { Truck, Pencil, Trash2, Gauge } from 'lucide-react';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { Vehicle, VehicleStatus, TrailerType } from '../types';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { VEHICLE_STATUS_LABELS } from '../constants';
import { formatNumber } from '../utils/formatters';

const TRAILER_TYPES: TrailerType[] = [
  'Dry Van (Caja Seca)', 'Reefer (Refrigerado)', 'Flatbed (Plataforma)', 'Tanker (Pipa)', 'Lowboy',
];

const EMPTY_VEHICLE: Omit<Vehicle, 'id'> = {
  unitNumber: '', plate: '', brand: '', model: '', year: new Date().getFullYear(),
  trailerType: 'Dry Van (Caja Seca)', odometer: 0, fuelType: 'Diesel',
  status: 'available', lastMaintenanceDate: '',
};

export default function VehiclesPage() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useVehiclesStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>(EMPTY_VEHICLE);

  const filtered = vehicles.filter((v) => {
    const matchSearch = v.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setForm(EMPTY_VEHICLE); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (v: Vehicle) => {
    const { id, ...rest } = v;
    setForm(rest); setEditingId(id); setIsModalOpen(true);
  };
  const handleSave = () => {
    if (editingId) updateVehicle(editingId, form);
    else addVehicle(form);
    setIsModalOpen(false);
  };
  const f = (key: keyof Omit<Vehicle, 'id'>, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Flotilla"
        subtitle={`${vehicles.length} unidades registradas`}
        icon={Truck}
        action={{ label: 'Nueva Unidad', onClick: openAdd }}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por unidad, placa o marca..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="in_transit">En Ruta</option>
          <option value="maintenance">Mantenimiento</option>
          <option value="out_of_service">Fuera de Servicio</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Truck} title="Sin unidades" description="Agrega unidades a tu flotilla." action={{ label: 'Nueva Unidad', onClick: openAdd }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => {
            const s = VEHICLE_STATUS_LABELS[v.status];
            return (
              <div key={v.id} className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-700 rounded-lg">
                      <Truck className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">{v.unitNumber}</p>
                      <p className="text-xs text-slate-400 font-mono">{v.plate}</p>
                    </div>
                  </div>
                  <StatusBadge colorClass={s.color} label={s.label} />
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vehículo</span>
                    <span className="text-white">{v.brand} {v.model} {v.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tipo</span>
                    <span className="text-white text-xs">{v.trailerType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Combustible</span>
                    <span className="text-white">{v.fuelType}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 mt-2">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Gauge className="w-3.5 h-3.5" />
                      <span className="text-xs">Odómetro</span>
                    </div>
                    <span className="text-white font-medium">{formatNumber(v.odometer)} km</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openEdit(v)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => deleteVehicle(v.id)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Unidad' : 'Nueva Unidad'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número de Unidad" required>
            <Input value={form.unitNumber} onChange={(e) => f('unitNumber', e.target.value)} placeholder="TR-105" />
          </FormField>
          <FormField label="Placa" required>
            <Input value={form.plate} onChange={(e) => f('plate', e.target.value)} placeholder="XX-00-XY" />
          </FormField>
          <FormField label="Marca" required>
            <Input value={form.brand} onChange={(e) => f('brand', e.target.value)} placeholder="Kenworth" />
          </FormField>
          <FormField label="Modelo">
            <Input value={form.model} onChange={(e) => f('model', e.target.value)} placeholder="T680" />
          </FormField>
          <FormField label="Año">
            <Input type="number" value={form.year} onChange={(e) => f('year', +e.target.value)} min={2000} max={2030} />
          </FormField>
          <FormField label="Tipo de Remolque">
            <Select value={form.trailerType} onChange={(e) => f('trailerType', e.target.value as TrailerType)}>
              {TRAILER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Tipo de Combustible">
            <Select value={form.fuelType} onChange={(e) => f('fuelType', e.target.value as 'Diesel' | 'Gasolina' | 'Gas LP')}>
              <option value="Diesel">Diesel</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Gas LP">Gas LP</option>
            </Select>
          </FormField>
          <FormField label="Odómetro (km)">
            <Input type="number" value={form.odometer} onChange={(e) => f('odometer', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Estatus">
            <Select value={form.status} onChange={(e) => f('status', e.target.value as VehicleStatus)}>
              <option value="available">Disponible</option>
              <option value="in_transit">En Ruta</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="out_of_service">Fuera de Servicio</option>
            </Select>
          </FormField>
          <FormField label="Último Mantenimiento">
            <Input type="date" value={form.lastMaintenanceDate} onChange={(e) => f('lastMaintenanceDate', e.target.value)} />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            {editingId ? 'Guardar Cambios' : 'Crear Unidad'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
