import { useState } from 'react';
import { Map, Pencil, Trash2, ArrowRight, ChevronRight } from 'lucide-react';
import { useTripsStore } from '../store/useTripsStore';
import { useClientsStore } from '../store/useClientsStore';
import { useDriversStore } from '../store/useDriversStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { Trip, TripStatus } from '../types';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../components/ui/FormElements';
import { TRIP_STATUS_LABELS } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';

const TRIP_FLOW: TripStatus[] = ['pending', 'assigned', 'loading', 'in_transit', 'delivered'];

const EMPTY_TRIP: Omit<Trip, 'id' | 'tripNumber'> = {
  clientId: '', clientName: '', driverId: '', driverName: '',
  vehicleId: '', vehicleUnit: '', origin: '', destination: '',
  cargoDescription: '', cargoWeightKg: 0, departureDate: '',
  deliveryDate: '', rate: 0, status: 'pending', distanceKm: 0, notes: '',
};

export default function TripsPage() {
  const { trips, addTrip, updateTrip, updateTripStatus, deleteTrip } = useTripsStore();
  const { clients } = useClientsStore();
  const { drivers } = useDriversStore();
  const { vehicles } = useVehiclesStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Trip, 'id' | 'tripNumber'>>(EMPTY_TRIP);

  const filtered = trips.filter((t) => {
    const matchSearch =
      t.tripNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.clientName.toLowerCase().includes(search.toLowerCase()) ||
      t.origin.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setForm(EMPTY_TRIP); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (t: Trip) => {
    const { id, tripNumber, ...rest } = t;
    setForm(rest); setEditingId(id); setIsModalOpen(true);
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setForm(prev => ({ ...prev, clientId, clientName: client?.name ?? '' }));
  };
  const handleDriverChange = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    setForm(prev => ({ ...prev, driverId, driverName: driver?.fullName ?? '' }));
  };
  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setForm(prev => ({ ...prev, vehicleId, vehicleUnit: vehicle?.unitNumber ?? '' }));
  };

  const handleSave = () => {
    if (editingId) updateTrip(editingId, form);
    else addTrip(form);
    setIsModalOpen(false);
  };
  const f = (key: keyof typeof form, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const advanceStatus = (trip: Trip) => {
    const idx = TRIP_FLOW.indexOf(trip.status);
    if (idx < TRIP_FLOW.length - 1) updateTripStatus(trip.id, TRIP_FLOW[idx + 1]);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Viajes & Despacho"
        subtitle={`${trips.length} viajes registrados`}
        icon={Map}
        action={{ label: 'Nuevo Viaje', onClick: openAdd }}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por folio, cliente, origen o destino..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(TRIP_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Map} title="Sin viajes" description="Crea el primer viaje para comenzar el despacho." action={{ label: 'Nuevo Viaje', onClick: openAdd }} />
      ) : (
        <div className="space-y-3">
          {filtered.map((trip) => {
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
                      <span>Operador: <span className="text-slate-300">{trip.driverName}</span></span>
                      <span>Unidad: <span className="text-slate-300">{trip.vehicleUnit}</span></span>
                      <span>Carga: <span className="text-slate-300">{trip.cargoDescription}</span></span>
                      <span>Distancia: <span className="text-slate-300">{trip.distanceKm} km</span></span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(trip.rate)}</p>
                    <div className="flex items-center gap-1">
                      {canAdvance && (
                        <button
                          onClick={() => advanceStatus(trip)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                          Avanzar
                        </button>
                      )}
                      <button onClick={() => openEdit(trip)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteTrip(trip.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Viaje' : 'Nuevo Viaje'} size="xl">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cliente" required>
            <Select value={form.clientId} onChange={(e) => handleClientChange(e.target.value)}>
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Operador" required>
            <Select value={form.driverId} onChange={(e) => handleDriverChange(e.target.value)}>
              <option value="">Seleccionar operador...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </Select>
          </FormField>
          <FormField label="Unidad" required>
            <Select value={form.vehicleId} onChange={(e) => handleVehicleChange(e.target.value)}>
              <option value="">Seleccionar unidad...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.unitNumber} — {v.brand} {v.model}</option>)}
            </Select>
          </FormField>
          <FormField label="Estatus">
            <Select value={form.status} onChange={(e) => f('status', e.target.value as TripStatus)}>
              {Object.entries(TRIP_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Origen" required>
            <Input value={form.origin} onChange={(e) => f('origin', e.target.value)} placeholder="Monterrey, NL" />
          </FormField>
          <FormField label="Destino" required>
            <Input value={form.destination} onChange={(e) => f('destination', e.target.value)} placeholder="Ciudad de México, CDMX" />
          </FormField>
          <FormField label="Fecha de Salida" required>
            <Input type="datetime-local" value={form.departureDate} onChange={(e) => f('departureDate', e.target.value)} />
          </FormField>
          <FormField label="Fecha Estimada de Entrega">
            <Input type="datetime-local" value={form.deliveryDate} onChange={(e) => f('deliveryDate', e.target.value)} />
          </FormField>
          <FormField label="Tarifa (MXN)" required>
            <Input type="number" value={form.rate} onChange={(e) => f('rate', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Distancia (km)">
            <Input type="number" value={form.distanceKm} onChange={(e) => f('distanceKm', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Descripción de Carga" className="col-span-2">
            <Input value={form.cargoDescription} onChange={(e) => f('cargoDescription', e.target.value)} placeholder="24 tarimas de alimentos no perecederos" />
          </FormField>
          <FormField label="Peso de Carga (kg)">
            <Input type="number" value={form.cargoWeightKg} onChange={(e) => f('cargoWeightKg', +e.target.value)} min={0} />
          </FormField>
          <FormField label="Notas">
            <Input value={form.notes ?? ''} onChange={(e) => f('notes', e.target.value)} placeholder="Instrucciones especiales..." />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            {editingId ? 'Guardar Cambios' : 'Crear Viaje'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
