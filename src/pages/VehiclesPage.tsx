import { useState } from 'react';
import { Truck, Pencil, Trash2, Gauge, Calculator, Fuel } from 'lucide-react';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { Vehicle, VehicleStatus, TrailerType } from '../types';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { VEHICLE_STATUS_LABELS } from '../constants';
import { formatNumber, formatCurrency } from '../utils/formatters';

const TRAILER_TYPES: TrailerType[] = [
  'Dry Van (Caja Seca)', 'Reefer (Refrigerado)', 'Flatbed (Plataforma)', 'Tanker (Pipa)', 'Lowboy',
];

function generateUnitNumber(vehicles: Vehicle[]): string {
  const numbers = vehicles
    .map((v) => { const m = v.unitNumber.match(/^TR-(\d+)$/); return m ? parseInt(m[1], 10) : 0; })
    .filter((n) => n > 0);
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 101;
  return `TR-${next}`;
}

const EMPTY_VEHICLE: Omit<Vehicle, 'id'> = {
  unitNumber: '', plate: '', brand: '', model: '', year: new Date().getFullYear(),
  trailerType: 'Dry Van (Caja Seca)', odometer: 0, fuelType: 'Diesel',
  status: 'available', lastMaintenanceDate: '',
};

// Valores por defecto del calculador según tipo de combustible
const FUEL_DEFAULTS: Record<string, { pricePerLiter: number; kmPerLiter: number }> = {
  'Diesel':   { pricePerLiter: 25.00, kmPerLiter: 3.5 },
  'Gasolina': { pricePerLiter: 22.00, kmPerLiter: 4.0 },
  'Gas LP':   { pricePerLiter: 12.00, kmPerLiter: 3.0 },
};

export default function VehiclesPage() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useVehiclesStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // modal CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>(EMPTY_VEHICLE);

  // modal calculador
  const [calcVehicle, setCalcVehicle] = useState<Vehicle | null>(null);
  const [pricePerLiter, setPricePerLiter] = useState(25.00);
  const [kmPerLiter, setKmPerLiter] = useState(3.5);
  const [margin, setMargin] = useState(20);

  // Cálculo derivado
  const fuelCostPerKm = kmPerLiter > 0 ? pricePerLiter / kmPerLiter : 0;
  const suggestedRatePerKm = fuelCostPerKm * (1 + margin / 100);

  const filtered = vehicles.filter((v) => {
    const matchSearch = v.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === 'all' || v.status === statusFilter);
  });

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm({ ...EMPTY_VEHICLE, unitNumber: generateUnitNumber(vehicles) });
    setEditingId(null); setIsModalOpen(true);
  };
  const openEdit = (v: Vehicle) => {
    const { id, ...rest } = v;
    setForm(rest); setEditingId(id); setIsModalOpen(true);
  };
  const handleSave = () => {
    if (editingId) updateVehicle(editingId, form); else addVehicle(form);
    setIsModalOpen(false);
  };
  const f = (key: keyof Omit<Vehicle, 'id'>, val: string | number) =>
    setForm((p) => ({ ...p, [key]: val }));

  // ── Calculador ────────────────────────────────────────────────────────────

  const openCalc = (v: Vehicle) => {
    const defaults = FUEL_DEFAULTS[v.fuelType] ?? FUEL_DEFAULTS['Diesel'];
    setPricePerLiter(defaults.pricePerLiter);
    setKmPerLiter(defaults.kmPerLiter);
    setMargin(20);
    setCalcVehicle(v);
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
                  <button
                    onClick={() => openCalc(v)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors font-medium"
                  >
                    <Calculator className="w-3.5 h-3.5" /> Costo / km
                  </button>
                  <button
                    onClick={() => openEdit(v)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteVehicle(v.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL CRUD ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Unidad' : 'Nueva Unidad'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número de Unidad">
            <div className="relative">
              <Input
                value={form.unitNumber}
                onChange={(e) => { if (editingId) f('unitNumber', e.target.value); }}
                readOnly={!editingId}
                className={!editingId ? 'bg-slate-700 text-slate-300 cursor-default select-none' : ''}
              />
              {!editingId && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Auto</span>
              )}
            </div>
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

      {/* ══ MODAL COSTO POR KM ════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!calcVehicle}
        onClose={() => setCalcVehicle(null)}
        title={`Costo por km — ${calcVehicle?.unitNumber}`}
        size="md"
      >
        {calcVehicle && (
          <div className="space-y-5">

            {/* Resumen unidad */}
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="p-2 bg-slate-700 rounded-lg">
                <Truck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {calcVehicle.brand} {calcVehicle.model} {calcVehicle.year}
                </p>
                <p className="text-xs text-slate-400">{calcVehicle.plate} · {calcVehicle.fuelType}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Odómetro</p>
                <p className="text-sm font-bold text-white">{formatNumber(calcVehicle.odometer)} km</p>
              </div>
            </div>

            {/* ── Inputs ─────────────────────────────────────────────────── */}
            <div className="space-y-4">
              {/* Costo de combustible */}
              <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-orange-400" />
                  <p className="text-sm font-medium text-white">Costo de combustible</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">Precio por litro (MXN)</p>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        value={pricePerLiter}
                        min={0}
                        step={0.10}
                        onChange={e => setPricePerLiter(Math.max(0, +e.target.value))}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-slate-400 text-xs">/ L</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">Rendimiento (km / L)</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={kmPerLiter}
                        min={0.1}
                        step={0.1}
                        onChange={e => setKmPerLiter(Math.max(0.1, +e.target.value))}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-slate-400 text-xs">km/L</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Margen */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    Margen de ganancia: <span className="text-white font-bold">{margin}%</span>
                  </label>
                  <input
                    type="number"
                    value={margin}
                    min={0}
                    max={500}
                    onChange={e => setMargin(Math.max(0, +e.target.value))}
                    className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white text-right focus:outline-none focus:border-blue-500"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.min(margin, 100)}
                  onChange={e => setMargin(+e.target.value)}
                  className="w-full h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            </div>

            {/* ── Resultado ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <p className="text-xs text-amber-300/70 mb-1">Costo de combustible / km</p>
                <p className="text-3xl font-bold text-amber-400">
                  ${fuelCostPerKm.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ${pricePerLiter.toFixed(2)} ÷ {kmPerLiter} km/L
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <p className="text-xs text-emerald-300/70 mb-1">Tarifa mínima (+{margin}%)</p>
                <p className="text-3xl font-bold text-emerald-400">
                  ${suggestedRatePerKm.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">MXN / km</p>
              </div>
            </div>

            {/* Tabla de ejemplo por distancia */}
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <p className="text-xs text-slate-400 mb-2 font-medium">
                Tarifa estimada por distancia (margen {margin}%)
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[200, 500, 920, 1500].map((km) => (
                  <div key={km} className="text-center p-2 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400">{formatNumber(km)} km</p>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(suggestedRatePerKm * km)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700">
              <button
                onClick={() => setCalcVehicle(null)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
