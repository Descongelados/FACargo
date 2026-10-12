import { useState } from 'react';
import { Truck, Pencil, Trash2, Gauge, Calculator, TrendingUp, Fuel, AlertCircle, Wrench, ReceiptText } from 'lucide-react';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { useTripsStore } from '../store/useTripsStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
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

// ── Tipos internos del calculador ────────────────────────────────────────────

interface CostBreakdown {
  fuel: number;
  toll: number;
  viatics: number;
  maintenance: number;
  other: number;
  totalExpenses: number;
  maintenanceCost: number;
  totalKm: number;
  costPerKm: number;
  trips: number;
}

export default function VehiclesPage() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useVehiclesStore();
  const { trips } = useTripsStore();
  const { expenses } = useExpensesStore();
  const { maintenances } = useMaintenanceStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // modal CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>(EMPTY_VEHICLE);

  // modal calculador
  const [calcVehicle, setCalcVehicle] = useState<Vehicle | null>(null);
  const [margin, setMargin] = useState(20); // % margen sobre costo
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);

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

  // ── Calculador de costo por km ────────────────────────────────────────────

  const openCalc = (v: Vehicle) => {
    setCalcVehicle(v);
    setMargin(20);
    computeBreakdown(v, 20);
  };

  const computeBreakdown = (v: Vehicle, marginPct: number) => {
    // Viajes de esta unidad
    const vehicleTrips = trips.filter(t => t.vehicleId === v.id);
    const totalKm = vehicleTrips.reduce((s, t) => s + (t.distanceKm ?? 0), 0);

    // Gastos ligados a esos viajes
    const tripIds = new Set(vehicleTrips.map(t => t.id));
    const vehicleExpenses = expenses.filter(e => e.tripId && tripIds.has(e.tripId));

    const fuel    = vehicleExpenses.filter(e => e.category === 'fuel').reduce((s, e) => s + e.amount, 0);
    const toll    = vehicleExpenses.filter(e => e.category === 'toll').reduce((s, e) => s + e.amount, 0);
    const viatics = vehicleExpenses.filter(e => e.category === 'viatics').reduce((s, e) => s + e.amount, 0);
    const maintExp= vehicleExpenses.filter(e => e.category === 'maintenance').reduce((s, e) => s + e.amount, 0);
    const other   = vehicleExpenses.filter(e => !['fuel','toll','viatics','maintenance'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
    const totalExpenses = fuel + toll + viatics + maintExp + other;

    // Costos de mantenimiento del taller registrados para esta unidad
    const maintenanceCost = maintenances
      .filter(m => m.vehicleId === v.id)
      .reduce((s, m) => s + m.cost, 0);

    const grandTotal = totalExpenses + maintenanceCost;
    const costPerKm = totalKm > 0 ? grandTotal / totalKm : 0;

    setBreakdown({
      fuel, toll, viatics, maintenance: maintExp, other,
      totalExpenses, maintenanceCost, totalKm,
      costPerKm, trips: vehicleTrips.length,
    });
  };

  const handleMarginChange = (val: number) => {
    setMargin(val);
    if (calcVehicle) computeBreakdown(calcVehicle, val);
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
        size="lg"
      >
        {calcVehicle && breakdown && (
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
                <p className="text-xs text-slate-400">{calcVehicle.plate} · {calcVehicle.trailerType}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Odómetro total</p>
                <p className="text-sm font-bold text-white">{formatNumber(calcVehicle.odometer)} km</p>
              </div>
            </div>

            {/* Sin datos */}
            {breakdown.totalKm === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Sin viajes registrados</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    No hay viajes con km ni gastos vinculados a esta unidad. Registra viajes y gastos para calcular el costo real.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desglose de gastos */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Desglose de gastos — {breakdown.trips} viaje{breakdown.trips !== 1 ? 's' : ''} · {formatNumber(breakdown.totalKm)} km recorridos
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: 'Combustible', value: breakdown.fuel, icon: Fuel, color: 'text-orange-400' },
                      { label: 'Casetas / Peajes', value: breakdown.toll, icon: ReceiptText, color: 'text-blue-400' },
                      { label: 'Viáticos', value: breakdown.viatics, icon: TrendingUp, color: 'text-purple-400' },
                      { label: 'Mant. en ruta', value: breakdown.maintenance, icon: Wrench, color: 'text-amber-400' },
                      { label: 'Otros gastos', value: breakdown.other, icon: ReceiptText, color: 'text-slate-400' },
                      { label: 'Mantenimientos (taller)', value: breakdown.maintenanceCost, icon: Wrench, color: 'text-rose-400' },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-700/30">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                          <span className="text-sm text-slate-300">{label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-white">{formatCurrency(value)}</span>
                          {breakdown.totalKm > 0 && (
                            <span className="text-xs text-slate-500 ml-2">
                              ${value > 0 ? (value / breakdown.totalKm).toFixed(2) : '0.00'}/km
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-700 border border-slate-600 mt-1">
                      <span className="text-sm font-semibold text-white">Total de costos</span>
                      <span className="text-sm font-bold text-white">
                        {formatCurrency(breakdown.totalExpenses + breakdown.maintenanceCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resultado costo/km */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                    <p className="text-xs text-amber-300/70 mb-1">Costo real por km</p>
                    <p className="text-3xl font-bold text-amber-400">
                      ${breakdown.costPerKm.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">MXN / km</p>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <p className="text-xs text-emerald-300/70 mb-1">
                      Tarifa mínima sugerida (+{margin}%)
                    </p>
                    <p className="text-3xl font-bold text-emerald-400">
                      ${(breakdown.costPerKm * (1 + margin / 100)).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">MXN / km</p>
                  </div>
                </div>

                {/* Control de margen */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">
                      Margen de ganancia: <span className="text-white font-bold">{margin}%</span>
                    </label>
                    <input
                      type="number"
                      value={margin}
                      min={0}
                      max={200}
                      onChange={(e) => handleMarginChange(Math.max(0, +e.target.value))}
                      className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.min(margin, 100)}
                    onChange={(e) => handleMarginChange(+e.target.value)}
                    className="w-full h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-slate-600 mt-1">
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                  </div>
                </div>

                {/* Ejemplo por distancia */}
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Ejemplo de tarifa por distancia (con margen {margin}%)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[200, 500, 920, 1500].map((km) => (
                      <div key={km} className="text-center p-2 bg-slate-700/50 rounded-lg">
                        <p className="text-xs text-slate-400">{formatNumber(km)} km</p>
                        <p className="text-sm font-bold text-white">
                          {formatCurrency(breakdown.costPerKm * (1 + margin / 100) * km)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

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
