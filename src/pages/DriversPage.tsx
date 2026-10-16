import { useState } from 'react';
import { UserCheck, Pencil, Trash2, Star, Route, ArrowRight } from 'lucide-react';
import { useDriversStore } from '../store/useDriversStore';
import { useVehiclesStore } from '../store/useVehiclesStore';
import { useTripsStore } from '../store/useTripsStore';
import { Driver, DriverStatus } from '../types';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { DRIVER_STATUS_LABELS, TRIP_STATUS_LABELS } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';
import { requireFields } from '../utils/validate';

const EMPTY_DRIVER: Omit<Driver, 'id'> = {
  fullName: '', licenseNumber: '', licenseExpiry: '', phone: '',
  emergencyContact: '', status: 'available', rating: 5.0, totalTrips: 0,
};

export default function DriversPage() {
  const { drivers, addDriver, updateDriver, deleteDriver } = useDriversStore();
  const { vehicles } = useVehiclesStore();
  const trips = useTripsStore((s) => s.trips);
  const [tripsDriver, setTripsDriver] = useState<Driver | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Driver, 'id'>>(EMPTY_DRIVER);

  const filtered = drivers.filter(
    (d) =>
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      d.licenseNumber.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_DRIVER); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (d: Driver) => {
    const { id, ...rest } = d;
    setForm(rest); setEditingId(id); setIsModalOpen(true);
  };
  const handleSave = () => {
    if (!requireFields({
      'Nombre Completo': form.fullName,
      'Número de Licencia': form.licenseNumber,
      'Vencimiento de Licencia': form.licenseExpiry,
    })) return;
    if (editingId) updateDriver(editingId, form);
    else addDriver(form);
    setIsModalOpen(false);
  };
  const driverTrips = tripsDriver ? trips.filter((t) => t.driverId === tripsDriver.id) : [];
  const f = (key: keyof Omit<Driver, 'id'>, val: string | number | undefined) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Operadores"
        subtitle={`${drivers.length} operadores registrados`}
        icon={UserCheck}
        action={{ label: 'Nuevo Operador', onClick: openAdd }}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o licencia..." />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserCheck} title="Sin operadores" description="Agrega tu primer operador." action={{ label: 'Nuevo Operador', onClick: openAdd }} />
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Operador', 'Licencia', 'Vencimiento', 'Teléfono', 'Unidad', 'Rating', 'Estatus', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((d) => {
                  const s = DRIVER_STATUS_LABELS[d.status];
                  const vehicle = vehicles.find(v => v.id === d.assignedVehicleId);
                  return (
                    <tr key={d.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{d.fullName}</p>
                        <p className="text-xs text-slate-400">{trips.filter((t) => t.driverId === d.id && t.status === 'delivered').length} viajes realizados</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{d.licenseNumber}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{d.licenseExpiry}</td>
                      <td className="px-4 py-3 text-slate-300">{d.phone}</td>
                      <td className="px-4 py-3 text-slate-300">{vehicle ? vehicle.unitNumber : <span className="text-slate-500">Sin asignar</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-white font-medium">{d.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge colorClass={s.color} label={s.label} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setTripsDriver(d)} title="Ver viajes" className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-600/20 text-slate-300 border border-slate-500/30 rounded-lg hover:bg-slate-600/30 transition-colors">
                            <Route className="w-3.5 h-3.5" /> Viajes
                            <span className="text-slate-500">{trips.filter((t) => t.driverId === d.id).length}</span>
                          </button>
                          <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteDriver(d.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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

      <Modal isOpen={!!tripsDriver} onClose={() => setTripsDriver(null)} title={`Viajes de ${tripsDriver?.fullName ?? ''}`} size="xl">
        {driverTrips.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Este operador aún no tiene viajes asignados.</p>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">
              {driverTrips.length} viaje{driverTrips.length === 1 ? '' : 's'} · {driverTrips.filter((t) => t.status === 'delivered').length} entregado{driverTrips.filter((t) => t.status === 'delivered').length === 1 ? '' : 's'}
            </p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {driverTrips.map((t) => {
                const s = TRIP_STATUS_LABELS[t.status];
                return (
                  <div key={t.id} className="bg-slate-700/30 border border-slate-700/50 rounded-lg p-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-white text-sm">{t.tripNumber}</span>
                        <StatusBadge colorClass={s.color} label={s.label} />
                        <span className="text-xs text-slate-400">{formatDate(t.departureDate)}</span>
                      </div>
                      <p className="text-sm text-white font-medium mb-0.5">Cliente: {t.clientName || '—'}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        {t.origin} <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {t.destination}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {t.cargoDescription}
                        {t.vehicleUnit && <> · Unidad: <span className="text-slate-300">{t.vehicleUnit}</span></>}
                      </p>
                    </div>
                    <p className="text-base font-bold text-emerald-400 shrink-0">{formatCurrency(t.rate)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Operador' : 'Nuevo Operador'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre Completo" required className="col-span-2">
            <Input value={form.fullName} onChange={(e) => f('fullName', e.target.value)} placeholder="Juan Pérez Gómez" />
          </FormField>
          <FormField label="Número de Licencia" required>
            <Input value={form.licenseNumber} onChange={(e) => f('licenseNumber', e.target.value)} placeholder="FED-123456A" />
          </FormField>
          <FormField label="Vencimiento de Licencia" required>
            <Input type="date" value={form.licenseExpiry} onChange={(e) => f('licenseExpiry', e.target.value)} />
          </FormField>
          <FormField label="Teléfono">
            <Input value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="+52 55 1234 5678" />
          </FormField>
          <FormField label="Contacto de Emergencia">
            <Input value={form.emergencyContact} onChange={(e) => f('emergencyContact', e.target.value)} placeholder="+52 55 8765 4321" />
          </FormField>
          <FormField label="Estatus">
            <Select value={form.status} onChange={(e) => f('status', e.target.value as DriverStatus)}>
              <option value="available">Disponible</option>
              <option value="on_trip">En Viaje</option>
              <option value="rest">En Descanso</option>
              <option value="inactive">Inactivo</option>
            </Select>
          </FormField>
          <FormField label="Unidad Asignada">
            <Select value={form.assignedVehicleId ?? ''} onChange={(e) => f('assignedVehicleId', e.target.value || undefined)}>
              <option value="">Sin asignar</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.unitNumber} — {v.brand} {v.model}</option>)}
            </Select>
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            {editingId ? 'Guardar Cambios' : 'Crear Operador'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
