import { useState, useMemo } from 'react';
import {
  Map, Pencil, Trash2, ArrowRight, ChevronRight,
  FileText, Plus, CheckCircle, Send, XCircle, RotateCcw,
  UserX, UserCheck, Calculator, Truck,
} from 'lucide-react';
import { useTripsStore } from '../store/useTripsStore';
import { useQuotesStore } from '../store/useQuotesStore';
import { useClientsStore } from '../store/useClientsStore';
import { useDriversStore } from '../store/useDriversStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { useExpensesStore } from '../store/useExpensesStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { Trip, TripStatus, Quote, QuoteStatus, TrailerType } from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { TRIP_STATUS_LABELS, QUOTE_STATUS_LABELS } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TRIP_FLOW: TripStatus[] = ['pending', 'assigned', 'loading', 'in_transit', 'delivered'];

const TRAILER_TYPES: TrailerType[] = [
  'Dry Van (Caja Seca)', 'Reefer (Refrigerado)', 'Flatbed (Plataforma)', 'Tanker (Pipa)', 'Lowboy',
];

const MIN_KM = 10;

const EMPTY_TRIP: Omit<Trip, 'id' | 'tripNumber'> = {
  clientId: '', clientName: '', driverId: '', driverName: '',
  vehicleId: '', vehicleUnit: '', origin: '', destination: '',
  cargoDescription: '', cargoWeightKg: 0, departureDate: '',
  deliveryDate: '', rate: 0, status: 'pending', distanceKm: 0, notes: '',
};

const EMPTY_QUOTE: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt'> = {
  clientId: '', clientName: '', guestClientPhone: '', guestClientEmail: '',
  vehicleId: '', vehicleUnit: '',
  origin: '', destination: '', cargoDescription: '', cargoWeightKg: 0,
  distanceKm: 0, trailerType: 'Dry Van (Caja Seca)', proposedRate: 0,
  validUntil: '', status: 'draft', notes: '',
};

type Tab = 'trips' | 'quotes';

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

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TripsPage() {
  const { trips, addTrip, updateTrip, updateTripStatus, deleteTrip } = useTripsStore();
  const { quotes, addQuote, updateQuote, updateQuoteStatus, deleteQuote } = useQuotesStore();
  const { clients } = useClientsStore();
  const { drivers } = useDriversStore();
  const { vehicles } = useVehiclesStore();
  const { expenses } = useExpensesStore();
  const { maintenances } = useMaintenanceStore();

  const [tab, setTab] = useState<Tab>('trips');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // modales viajes
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState<Omit<Trip, 'id' | 'tripNumber'>>(EMPTY_TRIP);

  // modales cotizaciones
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<Omit<Quote, 'id' | 'quoteNumber' | 'createdAt'>>(EMPTY_QUOTE);
  const [guestClient, setGuestClient] = useState(false);
  const [kmError, setKmError] = useState('');

  // ─── Costo/km de la unidad seleccionada en la cotización ──────────────────
  const quoteCostPerKm = useMemo(() => {
    if (!quoteForm.vehicleId) return 0;
    return calcCostPerKm(quoteForm.vehicleId, trips, expenses, maintenances);
  }, [quoteForm.vehicleId, trips, expenses, maintenances]);

  const quoteMinRate = quoteCostPerKm * quoteForm.distanceKm;
  const hasVehicleCost = quoteCostPerKm > 0 && quoteForm.distanceKm >= MIN_KM;

  // ─── Viajes ────────────────────────────────────────────────────────────────

  const filteredTrips = trips.filter((t) => {
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
    if (editingTripId) updateTrip(editingTripId, tripForm); else addTrip(tripForm);
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
    setTripForm(p => ({ ...p, vehicleId, vehicleUnit: v?.unitNumber ?? '' }));
  };
  const advanceStatus = (trip: Trip) => {
    const idx = TRIP_FLOW.indexOf(trip.status);
    if (idx < TRIP_FLOW.length - 1) updateTripStatus(trip.id, TRIP_FLOW[idx + 1]);
  };

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
    setQuoteModalOpen(true);
  };
  const openEditQuote = (q: Quote) => {
    const { id, quoteNumber, createdAt, ...rest } = q;
    setQuoteForm({ ...EMPTY_QUOTE, ...rest });
    setEditingQuoteId(id);
    setGuestClient(!q.clientId);
    setKmError('');
    setQuoteModalOpen(true);
  };
  const handleSaveQuote = () => {
    if (quoteForm.distanceKm < MIN_KM) {
      setKmError(`La distancia mínima es ${MIN_KM} km.`);
      return;
    }
    if (editingQuoteId) updateQuote(editingQuoteId, quoteForm); else addQuote(quoteForm);
    setQuoteModalOpen(false);
  };
  const fq = (key: keyof typeof quoteForm, val: string | number) =>
    setQuoteForm((p) => ({ ...p, [key]: val }));
  const handleQuoteClientChange = (clientId: string) => {
    const c = clients.find(c => c.id === clientId);
    setQuoteForm(p => ({ ...p, clientId, clientName: c?.name ?? '' }));
  };
  const handleQuoteVehicleChange = (vehicleId: string) => {
    const v = vehicles.find(v => v.id === vehicleId);
    setQuoteForm(p => ({ ...p, vehicleId, vehicleUnit: v?.unitNumber ?? '' }));
  };
  const handleQuoteKmChange = (val: number) => {
    setKmError(val > 0 && val < MIN_KM ? `La distancia mínima es ${MIN_KM} km.` : '');
    fq('distanceKm', val);
  };
  const toggleGuestClient = (isGuest: boolean) => {
    setGuestClient(isGuest);
    setQuoteForm(p => ({ ...p, clientId: '', clientName: '', guestClientPhone: '', guestClientEmail: '' }));
  };

  // Convertir cotización en viaje
  const convertToTrip = (q: Quote) => {
    addTrip({
      clientId: q.clientId, clientName: q.clientName,
      driverId: '', driverName: '',
      vehicleId: q.vehicleId ?? '', vehicleUnit: q.vehicleUnit ?? '',
      origin: q.origin, destination: q.destination,
      cargoDescription: q.cargoDescription, cargoWeightKg: q.cargoWeightKg,
      distanceKm: q.distanceKm, departureDate: '', deliveryDate: '',
      rate: q.proposedRate, status: 'pending',
      notes: `Generado desde cotización ${q.quoteNumber}`,
    });
    updateQuoteStatus(q.id, 'approved');
    setTab('trips');
    setStatusFilter('all');
    setSearch('');
  };

  const switchTab = (t: Tab) => { setTab(t); setSearch(''); setStatusFilter('all'); };

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
              {tab === 'trips' ? `${trips.length} viajes registrados` : `${quotes.length} cotizaciones registradas`}
            </p>
          </div>
        </div>
        <button
          onClick={tab === 'trips' ? openAddTrip : openAddQuote}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {tab === 'trips' ? 'Nuevo Viaje' : 'Nueva Cotización'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700/50 rounded-xl w-fit">
        {(['trips', 'quotes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'trips' ? <Map className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {t === 'trips' ? 'Viajes' : 'Cotizaciones'}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === t ? 'bg-blue-500' : 'bg-slate-700 text-slate-400'
            }`}>
              {t === 'trips' ? trips.length : quotes.length}
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
            placeholder={tab === 'trips'
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
          {Object.entries(tab === 'trips' ? TRIP_STATUS_LABELS : QUOTE_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ══ VIAJES ══════════════════════════════════════════════════════════════ */}
      {tab === 'trips' && (
        filteredTrips.length === 0 ? (
          <EmptyState icon={Map} title="Sin viajes" description="Crea el primer viaje para comenzar el despacho." action={{ label: 'Nuevo Viaje', onClick: openAddTrip }} />
        ) : (
          <div className="space-y-3">
            {filteredTrips.map((trip) => {
              const s = TRIP_STATUS_LABELS[trip.status];
              const canAdvance = trip.status !== 'delivered' && trip.status !== 'cancelled';
              return (
                <div key={trip.id} className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-4">
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
                        <span>Operador: <span className="text-slate-300">{trip.driverName || '—'}</span></span>
                        <span>Unidad: <span className="text-slate-300">{trip.vehicleUnit || '—'}</span></span>
                        <span>Carga: <span className="text-slate-300">{trip.cargoDescription}</span></span>
                        <span>Distancia: <span className="text-slate-300">{trip.distanceKm} km</span></span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(trip.rate)}</p>
                      <div className="flex items-center gap-1">
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
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(quote.proposedRate)}</p>
                      <div className="flex items-center gap-1">
                        {quote.status === 'draft' && (
                          <button onClick={() => updateQuoteStatus(quote.id, 'sent')} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors">
                            <Send className="w-3.5 h-3.5" /> Enviar
                          </button>
                        )}
                        {quote.status === 'sent' && (
                          <>
                            <button onClick={() => updateQuoteStatus(quote.id, 'approved')} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 transition-colors">
                              <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                            </button>
                            <button onClick={() => updateQuoteStatus(quote.id, 'rejected')} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-600/30 transition-colors">
                              <XCircle className="w-3.5 h-3.5" /> Rechazar
                            </button>
                          </>
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

          {/* Campos cliente */}
          {!guestClient ? (
            <FormField label="Cliente" required className="col-span-2">
              <Select value={quoteForm.clientId} onChange={(e) => handleQuoteClientChange(e.target.value)}>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
          ) : (
            <>
              <FormField label="Nombre del Prospecto" required className="col-span-2">
                <Input value={quoteForm.clientName} onChange={(e) => fq('clientName', e.target.value)} placeholder="Empresa o persona interesada" />
              </FormField>
              <FormField label="Teléfono de Contacto">
                <Input value={quoteForm.guestClientPhone ?? ''} onChange={(e) => fq('guestClientPhone', e.target.value)} placeholder="+52 55 1234 5678" />
              </FormField>
              <FormField label="Email de Contacto">
                <Input type="email" value={quoteForm.guestClientEmail ?? ''} onChange={(e) => fq('guestClientEmail', e.target.value)} placeholder="contacto@empresa.com" />
              </FormField>
            </>
          )}

          {/* Unidad de referencia */}
          <FormField label="Unidad de Referencia" className="col-span-2">
            <Select value={quoteForm.vehicleId ?? ''} onChange={(e) => handleQuoteVehicleChange(e.target.value)}>
              <option value="">Sin unidad — calcular manualmente</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.unitNumber} — {v.brand} {v.model} ({v.trailerType})</option>)}
            </Select>
          </FormField>

          {/* Panel costo/km — se muestra sólo cuando hay unidad seleccionada */}
          {quoteForm.vehicleId && (
            <div className="col-span-2">
              {quoteCostPerKm > 0 ? (
                <div className="grid grid-cols-3 gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
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
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-xs text-emerald-300/80">Tarifa mínima</p>
                    </div>
                    <p className={`text-lg font-bold ${ hasVehicleCost ? 'text-emerald-400' : 'text-slate-600' }`}>
                      {hasVehicleCost ? formatCurrency(quoteMinRate) : '—'}
                    </p>
                    <p className="text-xs text-slate-500">sin margen de ganancia</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-400">
                      La unidad <span className="text-white font-medium">{quoteForm.vehicleUnit}</span> aún no tiene viajes ni gastos registrados. El costo/km no está disponible.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ruta */}
          <FormField label="Origen" required>
            <Input value={quoteForm.origin} onChange={(e) => fq('origin', e.target.value)} placeholder="Monterrey, NL" />
          </FormField>
          <FormField label="Destino" required>
            <Input value={quoteForm.destination} onChange={(e) => fq('destination', e.target.value)} placeholder="Ciudad de México, CDMX" />
          </FormField>

          {/* Tipo de remolque y estatus */}
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

          {/* Carga */}
          <FormField label="Descripción de Carga" required className="col-span-2">
            <Input value={quoteForm.cargoDescription} onChange={(e) => fq('cargoDescription', e.target.value)} placeholder="Electrónicos, Alimentos, Acero..." />
          </FormField>
          <FormField label="Peso de Carga (kg)">
            <Input type="number" value={quoteForm.cargoWeightKg} onChange={(e) => fq('cargoWeightKg', +e.target.value)} min={0} />
          </FormField>

          {/* Distancia con validación mínima */}
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

          {/* Tarifa y vigencia */}
          <FormField label="Tarifa Propuesta (MXN)" required>
            <Input type="number" value={quoteForm.proposedRate} onChange={(e) => fq('proposedRate', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Válida Hasta" required>
            <Input type="date" value={quoteForm.validUntil} onChange={(e) => fq('validUntil', e.target.value)} />
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
