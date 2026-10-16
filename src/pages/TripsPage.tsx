import { useState, useMemo, useEffect } from 'react';
import {
  Map, Pencil, Trash2, ArrowRight, ChevronRight, ChevronDown, ChevronUp,
  FileText, Plus, Share2, XCircle, RotateCcw,
  UserX, UserCheck, Calculator, Truck, DollarSign, Receipt, Fuel, Eye, CheckCircle,
} from 'lucide-react';
import { useTripsStore } from '../store/useTripsStore';
import { useQuotesStore } from '../store/useQuotesStore';
import { useClientsStore } from '../store/useClientsStore';
import { useDriversStore } from '../store/useDriversStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { useInsuranceStore } from '../store/useInsuranceStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { Trip, TripStatus, Quote, QuoteStatus, TrailerType } from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { QuotePreviewModal } from '../components/quotes/QuoteModals';
import { shareQuotePdf, calcQuoteTotals } from '../utils/quotePdf';
import { useSettingsStore } from '../store/useSettingsStore';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { TRIP_STATUS_LABELS, QUOTE_STATUS_LABELS, EXPENSE_CATEGORIES } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';
import { requireFields } from '../utils/validate';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TRIP_FLOW: TripStatus[] = ['pending', 'assigned', 'loading', 'in_transit', 'delivered'];

// Siguiente estatus de una cotización con un click (aprobada y rechazada no avanzan)
const QUOTE_NEXT: Partial<Record<QuoteStatus, QuoteStatus>> = { draft: 'sent', sent: 'approved' };

const TRAILER_TYPES: TrailerType[] = [
  'Dry Van (Caja Seca)', 'Reefer (Refrigerado)', 'Flatbed (Plataforma)', 'Tanker (Pipa)', 'Lowboy',
];

const MIN_KM = 10;
// Costo fijo por km de desgaste y mantenimiento (MXN)
const WEAR_COST_PER_KM = 2;
// Margen de utilidad sugerido por defecto (%)
const DEFAULT_MARGIN = 25;
// Días entre los que se divide el sueldo semanal para obtener el costo diario
const WORK_DAYS_PER_WEEK = 7;

// Valores por defecto de combustible (mismos que el calculador de Flotilla)
const FUEL_DEFAULTS: Record<string, { pricePerLiter: number; kmPerLiter: number }> = {
  'Diesel':   { pricePerLiter: 25.00, kmPerLiter: 3.5 },
  'Gasolina': { pricePerLiter: 22.00, kmPerLiter: 4.0 },
  'Gas LP':   { pricePerLiter: 12.00, kmPerLiter: 3.0 },
};

type TripFormData = Omit<Trip, 'id' | 'tripNumber'>;

const EMPTY_TRIP: TripFormData = {
  clientId: '', clientName: '', driverId: '', driverName: '',
  vehicleId: '', vehicleUnit: '', origin: '', destination: '',
  cargoDescription: '', cargoWeightKg: 0, departureDate: '',
  deliveryDate: '', rate: 0, status: 'pending', distanceKm: 0, notes: '',
};

const EMPTY_QUOTE: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt'> = {
  clientId: '', clientName: '', guestClientPhone: '', guestClientEmail: '',
  guestClientContact: '', guestClientAddress: '',
  vehicleId: '', vehicleUnit: '',
  origin: '', destination: '', cargoDescription: '', cargoWeightKg: 0,
  distanceKm: MIN_KM, trailerType: 'Dry Van (Caja Seca)', proposedRate: 0,
  validUntil: '', serviceDate: '', reference: '', status: 'draft', notes: '',
};

type Tab = 'trips' | 'finished' | 'quotes';

const FINISHED_TRIP_STATUSES = ['delivered', 'cancelled'];
const isFinishedTrip = (status: string) => FINISHED_TRIP_STATUSES.includes(status);

// ─── Helper: calcular costo/km de una unidad ─────────────────────────────────

function calcCostPerKm(
  vehicleId: string,
  trips: ReturnType<typeof useTripsStore.getState>['trips'],
  expenses: ReturnType<typeof useExpensesStore.getState>['expenses'],
  maintenances: ReturnType<typeof useMaintenanceStore.getState>['maintenances'],
): number {
  const vehicleTrips = trips.filter(t => t.vehicleId === vehicleId);
  const totalKm = vehicleTrips.reduce((s, t) => s + (t.distanceKm ?? 0), 0);
  if (totalKm === 0) return 0;
  const tripIds = new Set(vehicleTrips.map(t => t.id));
  const totalExpenses = expenses
    .filter(e => e.tripId && tripIds.has(e.tripId))
    .reduce((s, e) => s + e.amount, 0);
  const maintenanceCost = maintenances
    .filter(m => m.vehicleId === vehicleId)
    .reduce((s, m) => s + m.cost, 0);
  return (totalExpenses + maintenanceCost) / totalKm;
}

// ─── Sub-componente: Panel de detalle de viaje ────────────────────────────────

function TripDetailPanel({ trip }: { trip: Trip }) {
  const { expenses } = useExpensesStore();
  const tripExpenses = expenses.filter(e => e.tripId === trip.id);
  const totalExpenses = tripExpenses.reduce((s, e) => s + e.amount, 0);
  const profit = trip.rate - totalExpenses;
  const margin = trip.rate > 0 ? (profit / trip.rate) * 100 : 0;

  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    label: cat.label,
    amount: tripExpenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.amount > 0);

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Métricas financieras */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Rentabilidad del viaje</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-700/40 rounded-lg p-2.5 text-center">
            <p className="text-xs text-slate-400 mb-0.5">Tarifa</p>
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(trip.rate)}</p>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-2.5 text-center">
            <p className="text-xs text-slate-400 mb-0.5">Gastos</p>
            <p className="text-sm font-bold text-rose-400">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className={`rounded-lg p-2.5 text-center ${
            profit >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'
          }`}>
            <p className="text-xs text-slate-400 mb-0.5">Utilidad</p>
            <p className={`text-sm font-bold ${ profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(profit)}
            </p>
          </div>
        </div>
        {trip.rate > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  margin >= 30 ? 'bg-emerald-500' : margin >= 10 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, margin))}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${
              margin >= 30 ? 'text-emerald-400' : margin >= 10 ? 'text-amber-400' : 'text-rose-400'
            }`}>{margin.toFixed(1)}% margen</span>
          </div>
        )}
        <div className="space-y-1.5 pt-1">
          {trip.distanceKm > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Costo / km</span>
              <span className="text-slate-300">
                {formatCurrency(totalExpenses > 0 && trip.distanceKm > 0 ? totalExpenses / trip.distanceKm : 0)} / km
              </span>
            </div>
          )}
          {trip.departureDate && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Salida</span>
              <span className="text-slate-300">{formatDate(trip.departureDate)}</span>
            </div>
          )}
          {trip.deliveryDate && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Entrega</span>
              <span className="text-slate-300">{formatDate(trip.deliveryDate)}</span>
            </div>
          )}
          {trip.cargoWeightKg > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Peso carga</span>
              <span className="text-slate-300">{trip.cargoWeightKg.toLocaleString('es-MX')} kg</span>
            </div>
          )}
          {trip.distanceKm > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Distancia</span>
              <span className="text-slate-300">{trip.distanceKm.toLocaleString('es-MX')} km</span>
            </div>
          )}
          {trip.notes && (
            <div className="flex justify-between text-xs gap-4">
              <span className="text-slate-500 shrink-0">Notas</span>
              <span className="text-slate-400 text-right italic">{trip.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Gastos del viaje */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Gastos registrados ({tripExpenses.length})
        </p>
        {tripExpenses.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
            <Receipt className="w-4 h-4 text-slate-500" />
            <p className="text-xs text-slate-500">Sin gastos registrados para este viaje</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tripExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{exp.description}</p>
                  <p className="text-xs text-slate-500">{EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label ?? exp.category}</p>
                </div>
                <p className="text-xs font-semibold text-rose-400 ml-2 shrink-0">{formatCurrency(exp.amount)}</p>
              </div>
            ))}
            {byCategory.length > 1 && (
              <div className="pt-1 mt-1 border-t border-slate-700/50 space-y-1">
                {byCategory.map(cat => (
                  <div key={cat.label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{cat.label}</span>
                    <span className="text-slate-400">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TripsPage() {
  const { trips, addTrip, updateTrip, updateTripStatus, deleteTrip } = useTripsStore();
  const { quotes, addQuote, updateQuote, updateQuoteStatus, deleteQuote } = useQuotesStore();
  const { clients } = useClientsStore();
  const { drivers } = useDriversStore();
  const { vehicles } = useVehiclesStore();
  const { policies } = useInsuranceStore();
  const { expenses } = useExpensesStore();
  const { maintenances } = useMaintenanceStore();
  const quoteConfig = useSettingsStore((s) => s.quoteConfig);

  const [tab, setTab] = useState<Tab>('trips');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  // modales viajes
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState<Omit<Trip, 'id' | 'tripNumber'>>(EMPTY_TRIP);

  // modales cotizaciones
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<Omit<Quote, 'id' | 'quoteNumber' | 'createdAt'>>(EMPTY_QUOTE);
  const [guestClient, setGuestClient] = useState(false);
  const [kmError, setKmError] = useState('');
  // true tras intentar guardar: marca en rojo los campos obligatorios vacíos
  const [quoteTried, setQuoteTried] = useState(false);
  const quoteMissing = (v?: string) => quoteTried && !v?.trim();
  const quoteFieldErr = (v?: string) => (quoteMissing(v) ? 'Campo obligatorio' : undefined);
  const quoteFieldCls = (v?: string) => (quoteMissing(v) ? 'border-rose-500 focus:border-rose-500' : '');
  const [quoteMargin, setQuoteMargin] = useState(DEFAULT_MARGIN);
  // true = la tarifa propuesta se recalcula sola (total estimado + utilidad); false = el usuario la capturó a mano
  const [rateAuto, setRateAuto] = useState(true);
  // Precio por litro editado a mano (null = usar el valor por defecto del combustible)
  const [quotePriceInput, setQuotePriceInput] = useState<number | null>(null);

  // ─── Costo/km de la unidad seleccionada en la cotización ──────────────────
  const quoteCostPerKm = useMemo(() => {
    if (!quoteForm.vehicleId) return 0;
    return calcCostPerKm(quoteForm.vehicleId, trips, expenses, maintenances);
  }, [quoteForm.vehicleId, trips, expenses, maintenances]);

  // ─── Costo estimado de combustible + 1 día de seguro de la unidad ─────────
  const quoteVehicle = vehicles.find(v => v.id === quoteForm.vehicleId);
  const quoteFuelDefaults = quoteVehicle
    ? (FUEL_DEFAULTS[quoteVehicle.fuelType] ?? FUEL_DEFAULTS['Diesel'])
    : undefined;
  const quoteKmPerLiter = quoteVehicle?.kmPerLiter ?? quoteFuelDefaults?.kmPerLiter ?? 0;
  const quotePricePerLiter = quotePriceInput ?? quoteFuelDefaults?.pricePerLiter ?? 0;
  const hasDistance = quoteForm.distanceKm >= MIN_KM;
  const quoteLiters = hasDistance && quoteKmPerLiter > 0 ? quoteForm.distanceKm / quoteKmPerLiter : 0;
  const quoteFuelCost = quoteLiters * quotePricePerLiter;
  const quotePolicy = quoteVehicle ? policies.find(p => p.vehicleId === quoteVehicle.id) : undefined;
  const quoteInsuranceDay = quotePolicy ? quotePolicy.annualPremium / 365 : 0;
  const quoteDriver = quoteVehicle ? drivers.find(d => d.assignedVehicleId === quoteVehicle.id) : undefined;
  // El sueldo semanal sale del operador asignado a la unidad (no es editable en la cotización)
  const quoteDriverSalary = quoteDriver?.weeklySalary ?? 0;
  const quoteWearCost = hasDistance ? quoteForm.distanceKm * WEAR_COST_PER_KM : 0;
  const quoteDriverSalaryDay = quoteDriverSalary / WORK_DAYS_PER_WEEK;
  const quoteEstimatedCost = quoteFuelCost + quoteInsuranceDay + quoteWearCost + quoteDriverSalaryDay;
  const quoteProfit = quoteEstimatedCost * (quoteMargin / 100);
  const quoteAutoRate = Math.round(quoteEstimatedCost + quoteProfit);
  const canAutoRate = !!quoteVehicle && hasDistance;

  // Tarifa propuesta = total estimado + utilidad (se actualiza al mover cualquier costo o la barra)
  useEffect(() => {
    if (!quoteModalOpen || !rateAuto || !canAutoRate) return;
    setQuoteForm(p => (p.proposedRate === quoteAutoRate ? p : { ...p, proposedRate: quoteAutoRate }));
  }, [quoteModalOpen, rateAuto, canAutoRate, quoteAutoRate]);

  // ─── Viajes ────────────────────────────────────────────────────────────────

  const activeTripsCount = trips.filter((t) => !isFinishedTrip(t.status)).length;
  const finishedTripsCount = trips.length - activeTripsCount;

  const filteredTrips = trips.filter((t) => {
    if (isFinishedTrip(t.status) !== (tab === 'finished')) return false;
    const matchSearch =
      t.tripNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.clientName.toLowerCase().includes(search.toLowerCase()) ||
      t.origin.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === 'all' || t.status === statusFilter);
  });

  const openAddTrip = () => { setTripForm(EMPTY_TRIP); setEditingTripId(null); setTripModalOpen(true); };
  const openEditTrip = (t: Trip) => {
    const { id, tripNumber, ...rest } = t;
    setTripForm(rest); setEditingTripId(id); setTripModalOpen(true);
  };
  const handleSaveTrip = () => {
    if (!requireFields({
      'Cliente': tripForm.clientId,
      'Operador': tripForm.driverId,
      'Unidad': tripForm.vehicleId,
      'Origen': tripForm.origin,
      'Destino': tripForm.destination,
      'Descripción de Carga': tripForm.cargoDescription,
      'Fecha de Salida': tripForm.departureDate,
    })) return;
    const { clientName: _cn, driverName: _dn, vehicleUnit: _vu, ...tripData } = tripForm;
    if (editingTripId) updateTrip(editingTripId, tripForm); else addTrip(tripData);
    setTripModalOpen(false);
  };
  const ft = (key: keyof typeof tripForm, val: string | number) =>
    setTripForm((p) => ({ ...p, [key]: val }));
  const handleTripClientChange = (clientId: string) => {
    const c = clients.find(c => c.id === clientId);
    setTripForm(p => ({ ...p, clientId, clientName: c?.name ?? '' }));
  };
  const handleTripDriverChange = (driverId: string) => {
    const d = drivers.find(d => d.id === driverId);
    setTripForm(p => ({ ...p, driverId, driverName: d?.fullName ?? '' }));
  };
  const handleTripVehicleChange = (vehicleId: string) => {
    const v = vehicles.find(v => v.id === vehicleId);
    // Propone el operador que tiene asignada la unidad (se puede cambiar después)
    const d = drivers.find(d => d.assignedVehicleId === vehicleId);
    setTripForm(p => ({
      ...p, vehicleId, vehicleUnit: v?.unitNumber ?? '',
      ...(d ? { driverId: d.id, driverName: d.fullName } : {}),
    }));
  };
  // Operador del viaje: el asignado al viaje o, si no tiene, el que tiene asignada la unidad
  const getTripDriver = (trip: Trip) => {
    if (trip.driverId) return drivers.find(d => d.id === trip.driverId);
    return trip.vehicleId ? drivers.find(d => d.assignedVehicleId === trip.vehicleId) : undefined;
  };
  const advanceStatus = (trip: Trip) => {
    // Un viaje no puede avanzar sin operador: si la unidad tiene uno asignado se guarda en el viaje;
    // si no, se abre la edición para asignarlo
    const driver = getTripDriver(trip);
    if (!driver) {
      requireFields({ 'Operador': '' });
      openEditTrip(trip);
      return;
    }
    const idx = TRIP_FLOW.indexOf(trip.status);
    if (idx >= TRIP_FLOW.length - 1) return;
    const next = TRIP_FLOW[idx + 1];
    if (trip.driverId) updateTripStatus(trip.id, next);
    else updateTrip(trip.id, { driverId: driver.id, status: next });
  };
  const toggleExpand = (id: string) =>
    setExpandedTripId(prev => (prev === id ? null : id));

  // ─── Cotizaciones ──────────────────────────────────────────────────────────

  const filteredQuotes = quotes.filter((q) => {
    const matchSearch =
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.clientName.toLowerCase().includes(search.toLowerCase()) ||
      q.origin.toLowerCase().includes(search.toLowerCase()) ||
      q.destination.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === 'all' || q.status === statusFilter);
  });

  const openAddQuote = () => {
    setQuoteForm(EMPTY_QUOTE);
    setEditingQuoteId(null);
    setGuestClient(false);
    setKmError('');
    setQuoteTried(false);
    setQuoteMargin(DEFAULT_MARGIN);
    setRateAuto(true);
    setQuotePriceInput(null);
    setQuoteModalOpen(true);
  };
  const openEditQuote = (q: Quote) => {
    const { id, quoteNumber, createdAt, ...rest } = q;
    setQuoteForm({ ...EMPTY_QUOTE, ...rest });
    setEditingQuoteId(id);
    setGuestClient(!q.clientId);
    setKmError('');
    setQuoteMargin(DEFAULT_MARGIN);
    setQuoteTried(false);
    setRateAuto(false); // conserva la tarifa guardada hasta que el usuario mueva un costo o la barra
    setQuotePriceInput(null);
    setQuoteModalOpen(true);
  };
  const handleSaveQuote = () => {
    setQuoteTried(true);
    if (!requireFields({
      [guestClient ? 'Nombre del Prospecto' : 'Cliente']: guestClient ? quoteForm.clientName : quoteForm.clientId,
      'Origen': quoteForm.origin,
      'Destino': quoteForm.destination,
      'Descripción de Carga': quoteForm.cargoDescription,
      'Válida Hasta': quoteForm.validUntil,
    })) return;
    if (quoteForm.distanceKm < MIN_KM) { setKmError(`La distancia mínima es ${MIN_KM} km.`); return; }
    if (editingQuoteId) updateQuote(editingQuoteId, quoteForm); else addQuote(quoteForm);
    setQuoteModalOpen(false);
  };
  const fq = (key: keyof typeof quoteForm, val: string | number) =>
    setQuoteForm((p) => ({ ...p, [key]: val }));
  const handleQuoteClientChange = (clientId: string) => {
    const c = clients.find(c => c.id === clientId);
    setQuoteForm(p => ({ ...p, clientId, clientName: c?.name ?? '' }));
  };

  // Al cambiar unidad, distancia, costos o utilidad, la tarifa propuesta vuelve a calcularse sola
  const handleQuoteVehicleChange = (vehicleId: string) => {
    const v = vehicles.find(v => v.id === vehicleId);
    setQuotePriceInput(null);
    setRateAuto(true);
    setQuoteForm(p => ({ ...p, vehicleId, vehicleUnit: v?.unitNumber ?? '' }));
  };

  const handleQuoteKmChange = (val: number) => {
    setKmError(val > 0 && val < MIN_KM ? `La distancia mínima es ${MIN_KM} km.` : '');
    setRateAuto(true);
    setQuoteForm(p => ({ ...p, distanceKm: val }));
  };

  const handleMarginChange = (margin: number) => {
    setQuoteMargin(margin);
    setRateAuto(true);
  };

  const toggleGuestClient = (isGuest: boolean) => {
    setGuestClient(isGuest);
    setQuoteForm(p => ({ ...p, clientId: '', clientName: '', guestClientPhone: '', guestClientEmail: '', guestClientContact: '', guestClientAddress: '' }));
  };

  const convertToTrip = (q: Quote) => {
    const unitDriver = q.vehicleId ? drivers.find(d => d.assignedVehicleId === q.vehicleId) : undefined;
    addTrip({
      clientId: q.clientId,
      driverId: unitDriver?.id ?? '',
      vehicleId: q.vehicleId ?? '',
      origin: q.origin, destination: q.destination,
      cargoDescription: q.cargoDescription, cargoWeightKg: q.cargoWeightKg,
      distanceKm: q.distanceKm, departureDate: '', deliveryDate: '',
      rate: q.proposedRate, status: 'pending',
      notes: `Generado desde cotización ${q.quoteNumber}`,
      quoteId: q.id,
    });
    updateQuoteStatus(q.id, 'approved');
    setTab('trips');
    setStatusFilter('all');
    setSearch('');
  };

  const switchTab = (t: Tab) => { setTab(t); setSearch(''); setStatusFilter('all'); setExpandedTripId(null); };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
            <Map className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Viajes & Despacho</h1>
            <p className="text-sm text-slate-400">
              {tab === 'trips' && `${activeTripsCount} viajes activos`}
              {tab === 'finished' && `${finishedTripsCount} viajes terminados`}
              {tab === 'quotes' && `${quotes.length} cotizaciones registradas`}
            </p>
          </div>
        </div>
        <button
          onClick={tab === 'quotes' ? openAddQuote : openAddTrip}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {tab === 'quotes' ? 'Nueva Cotización' : 'Nuevo Viaje'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700/50 rounded-xl w-fit">
        {(['trips', 'finished', 'quotes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'trips' ? <Map className="w-4 h-4" /> : t === 'finished' ? <CheckCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {t === 'trips' ? 'Viajes activos' : t === 'finished' ? 'Viajes terminados' : 'Cotizaciones'}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === t ? 'bg-blue-500' : 'bg-slate-700 text-slate-400'
            }`}>
              {t === 'trips' ? activeTripsCount : t === 'finished' ? finishedTripsCount : quotes.length}
            </span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={tab !== 'quotes'
              ? 'Buscar por folio, cliente, origen o destino...'
              : 'Buscar por número, cliente, origen o destino...'}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(tab === 'quotes' ? QUOTE_STATUS_LABELS : TRIP_STATUS_LABELS)
            .filter(([k]) => tab === 'quotes' || isFinishedTrip(k) === (tab === 'finished'))
            .map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ══ VIAJES ══════════════════════════════════════════════════════════════ */}
      {tab !== 'quotes' && (
        filteredTrips.length === 0 ? (
          tab === 'finished'
            ? <EmptyState icon={CheckCircle} title="Sin viajes terminados" description="Los viajes entregados o cancelados aparecerán aquí." />
            : <EmptyState icon={Map} title="Sin viajes activos" description="Crea un viaje para comenzar el despacho." action={{ label: 'Nuevo Viaje', onClick: openAddTrip }} />
        ) : (
          <div className="space-y-2">
            {filteredTrips.map((trip) => {
              const s = TRIP_STATUS_LABELS[trip.status];
              const canAdvance = trip.status !== 'delivered' && trip.status !== 'cancelled';
              const isExpanded = expandedTripId === trip.id;
              const tripExpensesTotal = expenses.filter(e => e.tripId === trip.id).reduce((sum, e) => sum + e.amount, 0);
              const sourceQuoteNumber = trip.notes?.match(/Generado desde cotización (\S+)/)?.[1];
              const sourceQuote = (trip.quoteId ? quotes.find(q => q.id === trip.quoteId) : undefined)
                ?? (sourceQuoteNumber ? quotes.find(q => q.quoteNumber === sourceQuoteNumber) : undefined);
              return (
                <div key={trip.id} className={`bg-slate-800 border rounded-xl p-4 transition-all ${
                  isExpanded ? 'border-blue-500/40' : 'border-slate-700/50 hover:border-slate-600'
                }`}>
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleExpand(trip.id)}
                      className="mt-0.5 p-1 text-slate-500 hover:text-slate-300 rounded transition-colors shrink-0"
                      title={isExpanded ? 'Colapsar' : 'Ver detalle'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-white text-sm">{trip.tripNumber}</span>
                        <StatusBadge colorClass={s.color} label={s.label} />
                        <span className="text-xs text-slate-400 ml-auto">{formatDate(trip.departureDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <span className="text-slate-300 font-medium">{trip.origin}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-slate-300 font-medium">{trip.destination}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>Cliente: <span className="text-slate-300">{trip.clientName}</span></span>
                        <span>Operador: <span className="text-slate-300">{getTripDriver(trip)?.fullName || trip.driverName || '—'}</span></span>
                        <span>Unidad: <span className="text-slate-300">{trip.vehicleUnit || '—'}</span></span>
                        <span>Carga: <span className="text-slate-300">{trip.cargoDescription}</span></span>
                        {trip.distanceKm > 0 && <span>Distancia: <span className="text-slate-300">{trip.distanceKm} km</span></span>}
                        {tripExpensesTotal > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Gastos: <span className="text-rose-400">{formatCurrency(tripExpensesTotal)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(trip.rate)}</p>
                      <div className="flex items-center gap-1">
                        {sourceQuote && (
                          <button onClick={() => setPreviewQuote(sourceQuote)} title={`Ver cotización ${sourceQuote.quoteNumber}`} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-600/20 text-slate-300 border border-slate-500/30 rounded-lg hover:bg-slate-600/30 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Cotización
                          </button>
                        )}
                        {canAdvance && (
                          <button onClick={() => advanceStatus(trip)} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" /> Avanzar
                          </button>
                        )}
                        <button onClick={() => openEditTrip(trip)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteTrip(trip.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && <TripDetailPanel trip={trip} />}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ══ COTIZACIONES ════════════════════════════════════════════════════════ */}
      {tab === 'quotes' && (
        filteredQuotes.length === 0 ? (
          <EmptyState icon={FileText} title="Sin cotizaciones" description="Crea la primera cotización para un cliente." action={{ label: 'Nueva Cotización', onClick: openAddQuote }} />
        ) : (
          <div className="space-y-3">
            {filteredQuotes.map((quote) => {
              const s = QUOTE_STATUS_LABELS[quote.status];
              const canConvert = quote.status === 'approved' || quote.status === 'sent';
              const isGuest = !quote.clientId;
              return (
                <div key={quote.id} className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-white text-sm">{quote.quoteNumber}</span>
                        <StatusBadge colorClass={s.color} label={s.label} />
                        {isGuest && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
                            <UserX className="w-3 h-3" /> Prospecto
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">
                          Válida hasta: <span className="text-slate-300">{formatDate(quote.validUntil)}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <span className="text-slate-300 font-medium">{quote.origin}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-slate-300 font-medium">{quote.destination}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>Cliente: <span className="text-slate-300">{quote.clientName}</span></span>
                        {quote.vehicleUnit && <span>Unidad: <span className="text-slate-300">{quote.vehicleUnit}</span></span>}
                        {quote.guestClientPhone && <span>Tel: <span className="text-slate-300">{quote.guestClientPhone}</span></span>}
                        {quote.guestClientEmail && <span>Email: <span className="text-slate-300">{quote.guestClientEmail}</span></span>}
                        <span>Carga: <span className="text-slate-300">{quote.cargoDescription}</span></span>
                        <span>Peso: <span className="text-slate-300">{quote.cargoWeightKg.toLocaleString('es-MX')} kg</span></span>
                        <span>Distancia: <span className="text-slate-300">{quote.distanceKm} km</span></span>
                        <span>Remolque: <span className="text-slate-300">{quote.trailerType}</span></span>
                      </div>
                      {quote.notes && <p className="text-xs text-slate-500 mt-1.5 italic">{quote.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">{formatCurrency(calcQuoteTotals(quote.proposedRate, quoteConfig).total)}</p>
                        <p className="text-xs text-slate-500">Flete base {formatCurrency(quote.proposedRate)} + IVA y cargos</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPreviewQuote(quote)} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-600/20 text-slate-300 border border-slate-500/30 rounded-lg hover:bg-slate-600/30 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                        {(quote.status === 'draft' || quote.status === 'sent') && (
                          <button onClick={() => shareQuotePdf(quote)} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors">
                            <Share2 className="w-3.5 h-3.5" /> Compartir
                          </button>
                        )}
                        {QUOTE_NEXT[quote.status] && (
                          <button onClick={() => updateQuoteStatus(quote.id, QUOTE_NEXT[quote.status]!)} title={`Cambiar a ${QUOTE_STATUS_LABELS[QUOTE_NEXT[quote.status]!].label}`} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" /> {QUOTE_STATUS_LABELS[QUOTE_NEXT[quote.status]!].label}
                          </button>
                        )}
                        {quote.status === 'sent' && (
                          <button onClick={() => updateQuoteStatus(quote.id, 'rejected')} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-600/30 transition-colors">
                            <XCircle className="w-3.5 h-3.5" /> Rechazar
                          </button>
                        )}
                        {quote.status === 'rejected' && (
                          <button onClick={() => updateQuoteStatus(quote.id, 'draft')} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-600/20 text-slate-400 border border-slate-500/30 rounded-lg hover:bg-slate-600/30 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                          </button>
                        )}
                        {canConvert && (
                          <button onClick={() => convertToTrip(quote)} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-600/30 transition-colors">
                            <Map className="w-3.5 h-3.5" /> → Viaje
                          </button>
                        )}
                        <button onClick={() => openEditQuote(quote)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteQuote(quote.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {previewQuote && <QuotePreviewModal quote={previewQuote} onClose={() => setPreviewQuote(null)} />}

      {/* ══ MODAL VIAJE ═════════════════════════════════════════════════════════ */}
      <Modal isOpen={tripModalOpen} onClose={() => setTripModalOpen(false)} title={editingTripId ? 'Editar Viaje' : 'Nuevo Viaje'} size="xl">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cliente" required>
            <Select value={tripForm.clientId} onChange={(e) => handleTripClientChange(e.target.value)}>
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Operador" required>
            <Select value={tripForm.driverId} onChange={(e) => handleTripDriverChange(e.target.value)}>
              <option value="">Seleccionar operador...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </Select>
          </FormField>
          <FormField label="Unidad" required>
            <Select value={tripForm.vehicleId} onChange={(e) => handleTripVehicleChange(e.target.value)}>
              <option value="">Seleccionar unidad...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.unitNumber} — {v.brand} {v.model}</option>)}
            </Select>
          </FormField>
          <FormField label="Estatus">
            <Select value={tripForm.status} onChange={(e) => ft('status', e.target.value as TripStatus)}>
              {Object.entries(TRIP_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Origen" required>
            <Input value={tripForm.origin} onChange={(e) => ft('origin', e.target.value)} placeholder="Monterrey, NL" />
          </FormField>
          <FormField label="Destino" required>
            <Input value={tripForm.destination} onChange={(e) => ft('destination', e.target.value)} placeholder="Ciudad de México, CDMX" />
          </FormField>
          <FormField label="Fecha de Salida" required>
            <Input type="datetime-local" value={tripForm.departureDate} onChange={(e) => ft('departureDate', e.target.value)} />
          </FormField>
          <FormField label="Fecha Estimada de Entrega">
            <Input type="datetime-local" value={tripForm.deliveryDate} onChange={(e) => ft('deliveryDate', e.target.value)} />
          </FormField>
          <FormField label="Tarifa (MXN)" required>
            <Input type="number" value={tripForm.rate} onChange={(e) => ft('rate', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Distancia (km)">
            <Input type="number" value={tripForm.distanceKm} onChange={(e) => ft('distanceKm', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Descripción de Carga" className="col-span-2">
            <Input value={tripForm.cargoDescription} onChange={(e) => ft('cargoDescription', e.target.value)} placeholder="24 tarimas de alimentos no perecederos" />
          </FormField>
          <FormField label="Peso de Carga (kg)">
            <Input type="number" value={tripForm.cargoWeightKg} onChange={(e) => ft('cargoWeightKg', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Notas">
            <Input value={tripForm.notes ?? ''} onChange={(e) => ft('notes', e.target.value)} placeholder="Instrucciones especiales..." />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setTripModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSaveTrip} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            {editingTripId ? 'Guardar Cambios' : 'Crear Viaje'}
          </button>
        </div>
      </Modal>

      {/* ══ MODAL COTIZACIÓN ════════════════════════════════════════════════════ */}
      <Modal isOpen={quoteModalOpen} onClose={() => setQuoteModalOpen(false)} title={editingQuoteId ? 'Editar Cotización' : 'Nueva Cotización'} size="xl">
        <div className="grid grid-cols-2 gap-4">
          {/* Toggle cliente */}
          <div className="col-span-2">
            <div className="flex gap-2 p-1 bg-slate-700/40 border border-slate-600/50 rounded-lg w-fit">
              <button type="button" onClick={() => toggleGuestClient(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !guestClient ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}>
                <UserCheck className="w-3.5 h-3.5" /> Cliente registrado
              </button>
              <button type="button" onClick={() => toggleGuestClient(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  guestClient ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}>
                <UserX className="w-3.5 h-3.5" /> Prospecto / Sin registro
              </button>
            </div>
          </div>

          {!guestClient ? (
            <FormField label="Cliente" required className="col-span-2" error={quoteFieldErr(quoteForm.clientId)}>
              <Select value={quoteForm.clientId} onChange={(e) => handleQuoteClientChange(e.target.value)} className={quoteFieldCls(quoteForm.clientId)}>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
          ) : (
            <>
              <FormField label="Nombre del Prospecto" required className="col-span-2" error={quoteFieldErr(quoteForm.clientName)}>
                <Input value={quoteForm.clientName} onChange={(e) => fq('clientName', e.target.value)} placeholder="Empresa o persona interesada" className={quoteFieldCls(quoteForm.clientName)} />
              </FormField>
              <FormField label="Teléfono de Contacto">
                <Input value={quoteForm.guestClientPhone ?? ''} onChange={(e) => fq('guestClientPhone', e.target.value)} placeholder="+52 55 1234 5678" />
              </FormField>
              <FormField label="Email de Contacto">
                <Input type="email" value={quoteForm.guestClientEmail ?? ''} onChange={(e) => fq('guestClientEmail', e.target.value)} placeholder="contacto@empresa.com" />
              </FormField>
              <FormField label="Nombre del Contacto">
                <Input value={quoteForm.guestClientContact ?? ''} onChange={(e) => fq('guestClientContact', e.target.value)} placeholder="Juan Pérez" />
              </FormField>
              <FormField label="Dirección">
                <Input value={quoteForm.guestClientAddress ?? ''} onChange={(e) => fq('guestClientAddress', e.target.value)} placeholder="Calle, número, ciudad, estado" />
              </FormField>
            </>
          )}

          <FormField label="Unidad de Referencia" className="col-span-2">
            <Select value={quoteForm.vehicleId ?? ''} onChange={(e) => handleQuoteVehicleChange(e.target.value)}>
              <option value="">Sin unidad — calcular manualmente</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.unitNumber} — {v.brand} {v.model} ({v.trailerType})</option>)}
            </Select>
          </FormField>

          {/* Panel costo/km */}
          {quoteForm.vehicleId && (
            <div className="col-span-2">
              {quoteCostPerKm > 0 ? (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Calculator className="w-3.5 h-3.5 text-amber-400" />
                        <p className="text-xs text-amber-300/80">Costo / km</p>
                      </div>
                      <p className="text-lg font-bold text-amber-400">${quoteCostPerKm.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">histórico {quoteForm.vehicleUnit}</p>
                    </div>
                    <div className="text-center border-x border-amber-500/10">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs text-slate-400">Distancia</p>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {quoteForm.distanceKm >= MIN_KM ? `${quoteForm.distanceKm} km` : '— km'}
                      </p>
                      <p className="text-xs text-slate-500">mín. {MIN_KM} km</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-400">
                      La unidad <span className="text-white font-medium">{quoteForm.vehicleUnit}</span> aún no tiene viajes ni gastos registrados.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Costo estimado: combustible (km ÷ rendimiento × precio) + 1 día de seguro + desgaste ($/km) + sueldo del operador */}
          {quoteVehicle && (
            <div className="col-span-2 p-3 bg-slate-700/30 border border-slate-600/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-orange-400" />
                  <p className="text-sm font-medium text-white">Costo estimado de la unidad</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Precio por litro</span>
                  <span className="text-slate-400 text-xs">$</span>
                  <input type="number" min={0} step={0.1} value={quotePricePerLiter}
                    onChange={(e) => { setQuotePriceInput(Math.max(0, +e.target.value)); setRateAuto(true); }}
                    className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white text-right focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Combustible</p>
                  <p className={`text-lg font-bold ${hasDistance ? 'text-orange-400' : 'text-slate-600'}`}>
                    {hasDistance ? formatCurrency(quoteFuelCost) : '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {hasDistance
                      ? `${quoteLiters.toFixed(1)} L · ${quoteKmPerLiter} km/L`
                      : `${quoteKmPerLiter} km/L`}
                  </p>
                </div>
                <div className="text-center border-x border-slate-600/50">
                  <p className="text-xs text-slate-400 mb-1">Seguro (1 día)</p>
                  <p className={`text-lg font-bold ${quotePolicy ? 'text-violet-400' : 'text-slate-600'}`}>
                    {quotePolicy ? formatCurrency(quoteInsuranceDay) : '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {quotePolicy ? quotePolicy.insurer : 'Sin póliza asignada'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Desgaste y mant.</p>
                  <p className={`text-lg font-bold ${hasDistance ? 'text-sky-400' : 'text-slate-600'}`}>
                    {hasDistance ? formatCurrency(quoteWearCost) : '—'}
                  </p>
                  <p className="text-xs text-slate-500">${WEAR_COST_PER_KM} MXN / km</p>
                </div>
                <div className="text-center pt-3 border-t border-slate-600/50">
                  <p className="text-xs text-slate-400 mb-1">Sueldo semanal del operador</p>
                  <p className={`text-lg font-bold ${quoteDriverSalary > 0 ? 'text-teal-400' : 'text-slate-600'}`}>
                    {quoteDriverSalary > 0 ? formatCurrency(quoteDriverSalary) : '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {quoteDriverSalary > 0
                      ? `${formatCurrency(quoteDriverSalaryDay)} / día (÷ ${WORK_DAYS_PER_WEEK})`
                      : quoteDriver ? 'Sin sueldo capturado' : 'Unidad sin operador asignado'}
                    {quoteDriver && ` · ${quoteDriver.fullName}`}
                  </p>
                </div>
                <div className="col-span-2 text-center pt-3 border-t border-slate-600/50">
                  <p className="text-xs text-slate-400 mb-1">Total estimado</p>
                  <p className={`text-lg font-bold ${hasDistance ? 'text-amber-400' : 'text-slate-600'}`}>
                    {hasDistance ? formatCurrency(quoteEstimatedCost) : '—'}
                  </p>
                  <p className="text-xs text-slate-500">combustible + seguro + desgaste + sueldo diario</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-600/50 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 shrink-0">Utilidad:</span>
                  <input type="range" min={0} max={100} value={quoteMargin}
                    onChange={(e) => handleMarginChange(+e.target.value)}
                    className="flex-1 h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                  <input type="number" min={0} max={200} value={quoteMargin}
                    onChange={(e) => handleMarginChange(Math.max(0, +e.target.value))}
                    className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white text-right focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Utilidad ({quoteMargin}%)</p>
                    <p className={`text-lg font-bold ${hasDistance ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {hasDistance ? formatCurrency(quoteProfit) : '—'}
                    </p>
                    <p className="text-xs text-slate-500">sugerido {DEFAULT_MARGIN}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Tarifa propuesta</p>
                    <p className={`text-lg font-bold ${hasDistance ? 'text-white' : 'text-slate-600'}`}>
                      {hasDistance ? formatCurrency(quoteAutoRate) : '—'}
                    </p>
                    <p className="text-xs text-slate-500">total estimado + utilidad</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <FormField label="Origen" required error={quoteFieldErr(quoteForm.origin)}>
            <Input value={quoteForm.origin} onChange={(e) => fq('origin', e.target.value)} placeholder="Monterrey, NL" className={quoteFieldCls(quoteForm.origin)} />
          </FormField>
          <FormField label="Destino" required error={quoteFieldErr(quoteForm.destination)}>
            <Input value={quoteForm.destination} onChange={(e) => fq('destination', e.target.value)} placeholder="Ciudad de México, CDMX" className={quoteFieldCls(quoteForm.destination)} />
          </FormField>

          <FormField label="Tipo de Remolque" required>
            <Select value={quoteForm.trailerType} onChange={(e) => fq('trailerType', e.target.value as TrailerType)}>
              {TRAILER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Estatus">
            <Select value={quoteForm.status} onChange={(e) => fq('status', e.target.value as QuoteStatus)}>
              {Object.entries(QUOTE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </FormField>

          <FormField label="Descripción de Carga" required className="col-span-2" error={quoteFieldErr(quoteForm.cargoDescription)}>
            <Input value={quoteForm.cargoDescription} onChange={(e) => fq('cargoDescription', e.target.value)} placeholder="Electrónicos, Alimentos, Acero..." className={quoteFieldCls(quoteForm.cargoDescription)} />
          </FormField>
          <FormField label="Peso de Carga (kg)">
            <Input type="number" value={quoteForm.cargoWeightKg} onChange={(e) => fq('cargoWeightKg', +e.target.value)} min={0} />
          </FormField>

          <FormField label={`Distancia estimada (km) — mín. ${MIN_KM} km`} error={kmError}>
            <Input
              type="number"
              value={quoteForm.distanceKm || ''}
              onChange={(e) => handleQuoteKmChange(+e.target.value)}
              min={MIN_KM}
              placeholder={`Mínimo ${MIN_KM} km`}
              className={kmError ? 'border-rose-500 focus:border-rose-500' : ''}
            />
          </FormField>

          <FormField label="Tarifa Propuesta (MXN)" required>
            <Input type="number" value={quoteForm.proposedRate} onChange={(e) => { setRateAuto(false); fq('proposedRate', +e.target.value); }} min={0} />
          </FormField>
          <FormField label="Válida Hasta" required error={quoteFieldErr(quoteForm.validUntil)}>
            <Input type="date" value={quoteForm.validUntil} onChange={(e) => fq('validUntil', e.target.value)} className={quoteFieldCls(quoteForm.validUntil)} />
          </FormField>
          <FormField label="Fecha de Servicio">
            <Input type="date" value={quoteForm.serviceDate ?? ''} onChange={(e) => fq('serviceDate', e.target.value)} />
          </FormField>
          <FormField label="Referencia del Servicio">
            <Input value={quoteForm.reference ?? ''} onChange={(e) => fq('reference', e.target.value)} placeholder="Carga y descarga en planta del cliente" />
          </FormField>
          <FormField label="Notas" className="col-span-2">
            <Input value={quoteForm.notes ?? ''} onChange={(e) => fq('notes', e.target.value)} placeholder="Condiciones especiales, restricciones..." />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setQuoteModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSaveQuote} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            {editingQuoteId ? 'Guardar Cambios' : 'Crear Cotización'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
