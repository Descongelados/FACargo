import { useState } from 'react';
import {
  Truck, Pencil, Trash2, Gauge, Calculator, Fuel,
  Shield, Plus, AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { useInsuranceStore } from '../store/useInsuranceStore';
import { Vehicle, VehicleStatus, TrailerType, InsurancePolicy, InsuranceCoverage } from '../types';
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

const COVERAGE_LABELS: Record<InsuranceCoverage, { label: string; color: string }> = {
  rc:      { label: 'Responsabilidad Civil',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  damage:  { label: 'Daños Materiales',          color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  theft:   { label: 'Robo Total',                color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  cargo:   { label: 'Mercancía / Carga',         color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  medical: { label: 'Gastos Médicos Ocupantes',  color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  full:    { label: 'Amplia (Todo incluido)',     color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

const COVERAGE_OPTIONS = Object.entries(COVERAGE_LABELS) as [InsuranceCoverage, { label: string; color: string }][];

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

const EMPTY_POLICY: Omit<InsurancePolicy, 'id'> = {
  vehicleId: '', vehicleUnit: '',
  policyNumber: '', insurer: '', coverage: 'full',
  annualPremium: 0, monthlyPayment: undefined,
  startDate: '', endDate: '',
  contactName: '', contactPhone: '', notes: '',
};

// Valores por defecto del calculador según tipo de combustible
const FUEL_DEFAULTS: Record<string, { pricePerLiter: number; kmPerLiter: number }> = {
  'Diesel':   { pricePerLiter: 25.00, kmPerLiter: 3.5 },
  'Gasolina': { pricePerLiter: 22.00, kmPerLiter: 4.0 },
  'Gas LP':   { pricePerLiter: 12.00, kmPerLiter: 3.0 },
};

/** Km promedio por día asumidos para el calculador (para expresar seguro en $/km) */
const KM_PER_DAY_ASSUMPTION = 400;

/** Días hasta la fecha de vencimiento (negativo = ya venció) */
function daysUntilExpiry(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

type PageTab = 'fleet' | 'insurance';

export default function VehiclesPage() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useVehiclesStore();
  const { policies, addPolicy, updatePolicy, deletePolicy } = useInsuranceStore();

  const [pageTab, setPageTab] = useState<PageTab>('fleet');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // modal CRUD vehículos
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState<Omit<Vehicle, 'id'>>(EMPTY_VEHICLE);

  // modal calculador
  const [calcVehicle, setCalcVehicle] = useState<Vehicle | null>(null);
  const [pricePerLiter, setPricePerLiter] = useState(25.00);
  const [kmPerLiter, setKmPerLiter] = useState(3.5);
  const [margin, setMargin] = useState(20);

  // modal CRUD pólizas
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<Omit<InsurancePolicy, 'id'>>(EMPTY_POLICY);

  // ─── Cálculos del calculador ───────────────────────────────────────────────
  const fuelCostPerKm = kmPerLiter > 0 ? pricePerLiter / kmPerLiter : 0;

  // Seguro diario de la unidad en el calculador
  const calcPolicy = calcVehicle ? policies.find(p => p.vehicleId === calcVehicle.id) : undefined;
  const dailyInsuranceCost = calcPolicy ? calcPolicy.annualPremium / 365 : 0;

  // Costo del seguro en $/km = costo diario ÷ km/día asumidos
  const insuranceCostPerKm = dailyInsuranceCost / KM_PER_DAY_ASSUMPTION;

  // Costo total / km = combustible + seguro
  const totalCostPerKm = fuelCostPerKm + insuranceCostPerKm;

  // Tarifa sugerida basada en el costo total
  const suggestedRatePerKm = totalCostPerKm * (1 + margin / 100);

  // Filtrado flotilla
  const filteredVehicles = vehicles.filter((v) => {
    const matchSearch =
      v.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === 'all' || v.status === statusFilter);
  });

  // Filtrado pólizas
  const filteredPolicies = policies.filter((p) =>
    p.vehicleUnit.toLowerCase().includes(search.toLowerCase()) ||
    p.policyNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.insurer.toLowerCase().includes(search.toLowerCase())
  );

  // ─── CRUD vehículos ──────────────────────────────────────────────────────

  const openAddVehicle = () => {
    setVehicleForm({ ...EMPTY_VEHICLE, unitNumber: generateUnitNumber(vehicles) });
    setEditingVehicleId(null);
    setIsVehicleModalOpen(true);
  };
  const openEditVehicle = (v: Vehicle) => {
    const { id, ...rest } = v;
    setVehicleForm(rest);
    setEditingVehicleId(id);
    setIsVehicleModalOpen(true);
  };
  const handleSaveVehicle = () => {
    if (editingVehicleId) updateVehicle(editingVehicleId, vehicleForm);
    else addVehicle(vehicleForm);
    setIsVehicleModalOpen(false);
  };
  const fv = (key: keyof Omit<Vehicle, 'id'>, val: string | number) =>
    setVehicleForm((p) => ({ ...p, [key]: val }));

  // ─── Calculador ───────────────────────────────────────────────────────

  const openCalc = (v: Vehicle) => {
    const defaults = FUEL_DEFAULTS[v.fuelType] ?? FUEL_DEFAULTS['Diesel'];
    setPricePerLiter(defaults.pricePerLiter);
    setKmPerLiter(defaults.kmPerLiter);
    setMargin(20);
    setCalcVehicle(v);
  };

  // ─── CRUD pólizas ──────────────────────────────────────────────────────

  const openAddPolicy = (v?: Vehicle) => {
    setPolicyForm({
      ...EMPTY_POLICY,
      vehicleId:   v?.id         ?? '',
      vehicleUnit: v?.unitNumber ?? '',
    });
    setEditingPolicyId(null);
    setIsPolicyModalOpen(true);
  };
  const openEditPolicy = (p: InsurancePolicy) => {
    const { id, ...rest } = p;
    setPolicyForm(rest);
    setEditingPolicyId(id);
    setIsPolicyModalOpen(true);
  };
  const handleSavePolicy = () => {
    if (editingPolicyId) updatePolicy(editingPolicyId, policyForm);
    else addPolicy(policyForm);
    setIsPolicyModalOpen(false);
  };
  const fp = (key: keyof Omit<InsurancePolicy, 'id'>, val: string | number | undefined) =>
    setPolicyForm((p) => ({ ...p, [key]: val }));

  // Cuando cambia la unidad en el form de póliza, sincronizar vehicleUnit
  const handlePolicyVehicleChange = (vehicleId: string) => {
    const v = vehicles.find(v => v.id === vehicleId);
    setPolicyForm(p => ({ ...p, vehicleId, vehicleUnit: v?.unitNumber ?? '' }));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
            <Truck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Flotilla & Seguros</h1>
            <p className="text-sm text-slate-400">
              {vehicles.length} unidades · {policies.length} pólizas registradas
            </p>
          </div>
        </div>
        <button
          onClick={pageTab === 'fleet' ? openAddVehicle : () => openAddPolicy()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {pageTab === 'fleet' ? 'Nueva Unidad' : 'Nueva Póliza'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700/50 rounded-xl w-fit">
        <button
          onClick={() => { setPageTab('fleet'); setSearch(''); setStatusFilter('all'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            pageTab === 'fleet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          Flotilla
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            pageTab === 'fleet' ? 'bg-blue-500' : 'bg-slate-700 text-slate-400'
          }`}>{vehicles.length}</span>
        </button>
        <button
          onClick={() => { setPageTab('insurance'); setSearch(''); setStatusFilter('all'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            pageTab === 'insurance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          Seguros
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            pageTab === 'insurance' ? 'bg-blue-500' : 'bg-slate-700 text-slate-400'
          }`}>{policies.length}</span>
        </button>
      </div>

      {/* Filtros compartidos */}
      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={
              pageTab === 'fleet'
                ? 'Buscar por unidad, placa o marca...'
                : 'Buscar por unidad, núm. póliza o aseguradora...'
            }
          />
        </div>
        {pageTab === 'fleet' && (
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
        )}
      </div>

      {/* ══ TAB: FLOTILLA ═══════════════════════════════════════════════ */}
      {pageTab === 'fleet' && (
        filteredVehicles.length === 0 ? (
          <EmptyState icon={Truck} title="Sin unidades" description="Agrega unidades a tu flotilla." action={{ label: 'Nueva Unidad', onClick: openAddVehicle }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredVehicles.map((v) => {
              const s = VEHICLE_STATUS_LABELS[v.status];
              const vehiclePolicy = policies.find(p => p.vehicleId === v.id);
              const daysLeft = vehiclePolicy ? daysUntilExpiry(vehiclePolicy.endDate) : null;
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
                    {/* Indicador de seguro */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="text-xs">Seguro</span>
                      </div>
                      {vehiclePolicy ? (
                        <span className={`text-xs font-medium ${
                          daysLeft === null ? 'text-slate-400'
                          : daysLeft < 0    ? 'text-rose-400'
                          : daysLeft < 30   ? 'text-amber-400'
                          : 'text-emerald-400'
                        }`}>
                          {daysLeft === null ? '—'
                          : daysLeft < 0    ? 'Vencida'
                          : daysLeft < 30   ? `Vence en ${daysLeft}d`
                          : vehiclePolicy.insurer}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Sin póliza</span>
                      )}
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
                      onClick={() => openEditVehicle(v)}
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
        )
      )}

      {/* ══ TAB: SEGUROS ══════════════════════════════════════════════ */}
      {pageTab === 'insurance' && (
        <div className="space-y-3">
          {/* Alerta de pólizas por vencer o vencidas */}
          {(() => {
            const expiring = policies.filter(p => {
              const d = daysUntilExpiry(p.endDate);
              return d < 30;
            });
            if (expiring.length === 0) return null;
            const expired = expiring.filter(p => daysUntilExpiry(p.endDate) < 0);
            return (
              <div className={`flex items-start gap-3 p-3 rounded-xl border ${
                expired.length > 0
                  ? 'bg-rose-500/5 border-rose-500/20'
                  : 'bg-amber-500/5 border-amber-500/20'
              }`}>
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  expired.length > 0 ? 'text-rose-400' : 'text-amber-400'
                }`} />
                <p className="text-sm text-slate-300">
                  {expired.length > 0
                    ? <><span className="text-rose-400 font-semibold">{expired.length} póliza{expired.length > 1 ? 's' : ''} vencida{expired.length > 1 ? 's'  : ''}</span>: {expired.map(p => p.vehicleUnit).join(', ')}.</>
                    : null}
                  {expiring.length - expired.length > 0
                    ? <><span className="text-amber-400 font-semibold">{expiring.length - expired.length} póliza{expiring.length - expired.length > 1 ? 's' : ''} por vencer</span> en menos de 30 días: {expiring.filter(p => daysUntilExpiry(p.endDate) >= 0).map(p => p.vehicleUnit).join(', ')}.</>
                    : null}
                </p>
              </div>
            );
          })()}

          {filteredPolicies.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="Sin pólizas"
              description="Registra la primera póliza de seguro de tu flotilla."
              action={{ label: 'Nueva Póliza', onClick: () => openAddPolicy() }}
            />
          ) : (
            filteredPolicies.map((policy) => {
              const days  = daysUntilExpiry(policy.endDate);
              const cov   = COVERAGE_LABELS[policy.coverage];
              const isExpired  = days < 0;
              const isExpiring = days >= 0 && days < 30;
              return (
                <div
                  key={policy.id}
                  className={`bg-slate-800 border rounded-xl p-4 transition-colors ${
                    isExpired  ? 'border-rose-500/30'
                    : isExpiring ? 'border-amber-500/30'
                    : 'border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Primera fila: unidad + cobertura + estado */}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-white text-sm">{policy.vehicleUnit}</span>
                        </div>
                        <StatusBadge colorClass={cov.color} label={cov.label} />
                        {isExpired && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" /> Vencida
                          </span>
                        )}
                        {isExpiring && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" /> Vence en {days}d
                          </span>
                        )}
                        {!isExpired && !isExpiring && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" /> Vigente
                          </span>
                        )}
                      </div>

                      {/* Segunda fila: datos clave */}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>Póliza: <span className="text-slate-200 font-mono">{policy.policyNumber}</span></span>
                        <span>Aseguradora: <span className="text-slate-300">{policy.insurer}</span></span>
                        <span>Inicio: <span className="text-slate-300">{policy.startDate}</span></span>
                        <span>Vencimiento: <span className={isExpired ? 'text-rose-400' : isExpiring ? 'text-amber-400' : 'text-slate-300'}>{policy.endDate}</span></span>
                        {policy.contactName && <span>Contacto: <span className="text-slate-300">{policy.contactName}</span></span>}
                        {policy.contactPhone && <span>Tel: <span className="text-slate-300">{policy.contactPhone}</span></span>}
                      </div>

                      {policy.notes && (
                        <p className="text-xs text-slate-500 mt-1.5 italic">{policy.notes}</p>
                      )}
                    </div>

                    {/* Columna derecha: primas + acciones */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{formatCurrency(policy.annualPremium)}</p>
                        <p className="text-xs text-slate-500">prima anual</p>
                        {policy.monthlyPayment && (
                          <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(policy.monthlyPayment)}/mes</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditPolicy(policy)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePolicy(policy.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ══ MODAL CRUD VEHÍCULO ═════════════════════════════════════════ */}
      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        title={editingVehicleId ? 'Editar Unidad' : 'Nueva Unidad'}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número de Unidad">
            <div className="relative">
              <Input
                value={vehicleForm.unitNumber}
                onChange={(e) => { if (editingVehicleId) fv('unitNumber', e.target.value); }}
                readOnly={!editingVehicleId}
                className={!editingVehicleId ? 'bg-slate-700 text-slate-300 cursor-default select-none' : ''}
              />
              {!editingVehicleId && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Auto</span>
              )}
            </div>
          </FormField>
          <FormField label="Placa" required>
            <Input value={vehicleForm.plate} onChange={(e) => fv('plate', e.target.value)} placeholder="XX-00-XY" />
          </FormField>
          <FormField label="Marca" required>
            <Input value={vehicleForm.brand} onChange={(e) => fv('brand', e.target.value)} placeholder="Kenworth" />
          </FormField>
          <FormField label="Modelo">
            <Input value={vehicleForm.model} onChange={(e) => fv('model', e.target.value)} placeholder="T680" />
          </FormField>
          <FormField label="Año">
            <Input type="number" value={vehicleForm.year} onChange={(e) => fv('year', +e.target.value)} min={2000} max={2030} />
          </FormField>
          <FormField label="Tipo de Remolque">
            <Select value={vehicleForm.trailerType} onChange={(e) => fv('trailerType', e.target.value as TrailerType)}>
              {TRAILER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Tipo de Combustible">
            <Select value={vehicleForm.fuelType} onChange={(e) => fv('fuelType', e.target.value as 'Diesel' | 'Gasolina' | 'Gas LP')}>
              <option value="Diesel">Diesel</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Gas LP">Gas LP</option>
            </Select>
          </FormField>
          <FormField label="Odómetro (km)">
            <Input type="number" value={vehicleForm.odometer} onChange={(e) => fv('odometer', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Estatus">
            <Select value={vehicleForm.status} onChange={(e) => fv('status', e.target.value as VehicleStatus)}>
              <option value="available">Disponible</option>
              <option value="in_transit">En Ruta</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="out_of_service">Fuera de Servicio</option>
            </Select>
          </FormField>
          <FormField label="Último Mantenimiento">
            <Input type="date" value={vehicleForm.lastMaintenanceDate} onChange={(e) => fv('lastMaintenanceDate', e.target.value)} />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setIsVehicleModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSaveVehicle} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            {editingVehicleId ? 'Guardar Cambios' : 'Crear Unidad'}
          </button>
        </div>
      </Modal>

      {/* ══ MODAL CRUD PÓLIZA ══════════════════════════════════════════ */}
      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title={editingPolicyId ? 'Editar Póliza' : 'Nueva Póliza de Seguro'}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Unidad" required className="col-span-2">
            <Select value={policyForm.vehicleId} onChange={(e) => handlePolicyVehicleChange(e.target.value)}>
              <option value="">Seleccionar unidad...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.unitNumber} — {v.brand} {v.model}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Número de Póliza" required>
            <Input
              value={policyForm.policyNumber}
              onChange={(e) => fp('policyNumber', e.target.value)}
              placeholder="GNP-2024-00891"
            />
          </FormField>
          <FormField label="Aseguradora" required>
            <Input
              value={policyForm.insurer}
              onChange={(e) => fp('insurer', e.target.value)}
              placeholder="GNP, AXA, Quálitas..."
            />
          </FormField>

          <FormField label="Tipo de Cobertura" required className="col-span-2">
            <Select value={policyForm.coverage} onChange={(e) => fp('coverage', e.target.value as InsuranceCoverage)}>
              {COVERAGE_OPTIONS.map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Prima Anual (MXN)" required>
            <Input
              type="number"
              value={policyForm.annualPremium}
              onChange={(e) => fp('annualPremium', +e.target.value)}
              min={0}
            />
          </FormField>
          <FormField label="Pago Mensual (MXN)">
            <Input
              type="number"
              value={policyForm.monthlyPayment ?? ''}
              onChange={(e) => fp('monthlyPayment', e.target.value === '' ? undefined : +e.target.value)}
              min={0}
              placeholder="Opcional"
            />
          </FormField>

          <FormField label="Fecha de Inicio" required>
            <Input
              type="date"
              value={policyForm.startDate}
              onChange={(e) => fp('startDate', e.target.value)}
            />
          </FormField>
          <FormField label="Fecha de Vencimiento" required>
            <Input
              type="date"
              value={policyForm.endDate}
              onChange={(e) => fp('endDate', e.target.value)}
            />
          </FormField>

          <FormField label="Nombre del Contacto">
            <Input
              value={policyForm.contactName ?? ''}
              onChange={(e) => fp('contactName', e.target.value)}
              placeholder="Agente o ejecutivo de cuenta"
            />
          </FormField>
          <FormField label="Teléfono de Contacto">
            <Input
              value={policyForm.contactPhone ?? ''}
              onChange={(e) => fp('contactPhone', e.target.value)}
              placeholder="+52 55 1234 5678"
            />
          </FormField>

          <FormField label="Notas" className="col-span-2">
            <Input
              value={policyForm.notes ?? ''}
              onChange={(e) => fp('notes', e.target.value)}
              placeholder="Coberturas adicionales, exclusiones, condiciones..."
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button
            onClick={() => setIsPolicyModalOpen(false)}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSavePolicy}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
          >
            {editingPolicyId ? 'Guardar Cambios' : 'Registrar Póliza'}
          </button>
        </div>
      </Modal>

      {/* ══ MODAL CALCULADOR COSTO/KM ═════════════════════════════════════─ */}
      <Modal
        isOpen={!!calcVehicle}
        onClose={() => setCalcVehicle(null)}
        title={`Costo por km — ${calcVehicle?.unitNumber}`}
        size="md"
      >
        {calcVehicle && (
          <div className="space-y-5">
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

            <div className="space-y-4">
              {/* ── Costo de combustible ── */}
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

              {/* ── Costo del seguro ── */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                calcPolicy
                  ? 'bg-violet-500/5 border-violet-500/20'
                  : 'bg-slate-700/20 border-slate-600/40'
              }`}>
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${calcPolicy ? 'text-violet-400' : 'text-slate-500'}`} />
                  <p className={`text-sm font-medium ${calcPolicy ? 'text-white' : 'text-slate-500'}`}>
                    Costo del seguro
                  </p>
                  {!calcPolicy && (
                    <span className="ml-auto text-xs text-slate-500 italic">Sin póliza asignada</span>
                  )}
                </div>
                {calcPolicy ? (
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Aseguradora</p>
                      <p className="text-sm text-white font-medium">{calcPolicy.insurer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Prima anual</p>
                      <p className="text-sm text-white font-medium">{formatCurrency(calcPolicy.annualPremium)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Costo / día</p>
                      <p className="text-sm font-bold text-violet-400">{formatCurrency(dailyInsuranceCost)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 pt-0.5">
                    Registra una póliza en la pestaña <span className="text-slate-400">Seguros</span> para ver este dato.
                  </p>
                )}
              </div>

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

            {/* ── Tarjetas de resultado ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <p className="text-xs text-amber-300/70 mb-1">Costo total / km</p>
                <p className="text-3xl font-bold text-amber-400">${totalCostPerKm.toFixed(2)}</p>
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs text-slate-500">
                    Combustible: ${fuelCostPerKm.toFixed(2)} / km
                  </p>
                  {calcPolicy && (
                    <p className="text-xs text-violet-400/70">
                      Seguro: ${insuranceCostPerKm.toFixed(2)} / km
                      <span className="text-slate-600 ml-1">({KM_PER_DAY_ASSUMPTION} km/día)</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <p className="text-xs text-emerald-300/70 mb-1">Tarifa mínima (+{margin}%)</p>
                <p className="text-3xl font-bold text-emerald-400">${suggestedRatePerKm.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">MXN / km</p>
              </div>
            </div>

            <div className="p-3 bg-slate-700/30 rounded-lg">
              <p className="text-xs text-slate-400 mb-2 font-medium">Tarifa estimada por distancia (margen {margin}%)</p>
              <div className="grid grid-cols-4 gap-2">
                {[200, 500, 920, 1500].map((km) => (
                  <div key={km} className="text-center p-2 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400">{formatNumber(km)} km</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(suggestedRatePerKm * km)}</p>
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
