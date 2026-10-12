export const APP_NAME = "FreightFlow TMS";

export const TRIP_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  assigned: { label: "Asignado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  loading: { label: "Cargando", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  in_transit: { label: "En Tránsito", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  delivered: { label: "Entregado", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  cancelled: { label: "Cancelado", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
};

export const QUOTE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  sent: { label: "Enviada", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  approved: { label: "Aprobada", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  rejected: { label: "Rechazada", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
};

export const VEHICLE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: "Disponible", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  in_transit: { label: "En Ruta", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  maintenance: { label: "Mantenimiento", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  out_of_service: { label: "Fuera de Servicio", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
};

export const DRIVER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: "Disponible", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  on_trip: { label: "En Viaje", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  rest: { label: "En Descanso", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  inactive: { label: "Inactivo", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
};

export const EXPENSE_CATEGORIES = [
  { value: 'fuel', label: 'Combustible (Diesel)' },
  { value: 'toll', label: 'Casetas / Peajes' },
  { value: 'viatics', label: 'Viáticos de Operador' },
  { value: 'maintenance', label: 'Mantenimiento en Ruta' },
  { value: 'fine', label: 'Infracción / Multa' },
  { value: 'other', label: 'Otros Gastos' },
];
