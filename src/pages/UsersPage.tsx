import { useState } from 'react';
import { Shield, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { User, Role } from '../types';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { ROLE_LABELS } from '../constants/roles';

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  dispatcher: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  operator: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  finance: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  viewer: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'viewer' as Role };

export default function UsersPage() {
  const { users, addUser, currentUser, loadUsers } = useAuthStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_FORM); setSaveError(null); setIsModalOpen(true); };
  const handleSave = async () => {
    setSaving(true);
    const err = await addUser(form.email, form.password, form.name, form.role);
    setSaving(false);
    if (err) { setSaveError(err); return; }
    await loadUsers();
    setIsModalOpen(false);
  };
  const f = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios & Accesos"
        subtitle={`${users.length} usuarios registrados`}
        icon={Shield}
        action={{ label: 'Nuevo Usuario', onClick: openAdd, icon: UserPlus }}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o email..." />
        </div>
      </div>

      {/* Tabla de permisos por rol */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Matriz de Permisos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 text-slate-400">Permiso</th>
                {(['admin', 'dispatcher', 'operator', 'finance', 'viewer'] as Role[]).map(r => (
                  <th key={r} className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full border text-xs ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {[
                { label: 'Ver Dashboard', key: 'viewDashboard' },
                { label: 'Gestionar Viajes', key: 'manageTrips' },
                { label: 'Gestionar Clientes', key: 'manageClients' },
                { label: 'Gestionar Operadores', key: 'manageDrivers' },
                { label: 'Gestionar Unidades', key: 'manageVehicles' },
                { label: 'Gestionar Gastos', key: 'manageExpenses' },
                { label: 'Mantenimientos', key: 'manageMaintenance' },
                { label: 'Ver Reportes', key: 'viewReports' },
                { label: 'Gestionar Usuarios', key: 'manageUsers' },
                { label: 'Configuración', key: 'manageSettings' },
              ].map(({ label, key }) => (
                <tr key={key}>
                  <td className="py-2 pr-4 text-slate-400">{label}</td>
                  {(['admin', 'dispatcher', 'operator', 'finance', 'viewer'] as Role[]).map(role => {
                    const perms: Record<string, Record<string, boolean>> = {
                      admin: { viewDashboard:true, manageTrips:true, manageClients:true, manageDrivers:true, manageVehicles:true, manageExpenses:true, manageMaintenance:true, viewReports:true, manageUsers:true, manageSettings:true },
                      dispatcher: { viewDashboard:true, manageTrips:true, manageClients:true, manageDrivers:true, manageVehicles:true, manageExpenses:false, manageMaintenance:false, viewReports:false, manageUsers:false, manageSettings:false },
                      operator: { viewDashboard:true, manageTrips:false, manageClients:false, manageDrivers:false, manageVehicles:false, manageExpenses:true, manageMaintenance:false, viewReports:false, manageUsers:false, manageSettings:false },
                      finance: { viewDashboard:true, manageTrips:false, manageClients:true, manageDrivers:false, manageVehicles:false, manageExpenses:true, manageMaintenance:true, viewReports:true, manageUsers:false, manageSettings:false },
                      viewer: { viewDashboard:true, manageTrips:false, manageClients:false, manageDrivers:false, manageVehicles:false, manageExpenses:false, manageMaintenance:false, viewReports:true, manageUsers:false, manageSettings:false },
                    };
                    const allowed = perms[role][key];
                    return (
                      <td key={role} className="px-3 py-2 text-center">
                        {allowed
                          ? <span className="text-emerald-400">✓</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Shield} title="Sin usuarios" description="Agrega el primer usuario." action={{ label: 'Nuevo Usuario', onClick: openAdd }} />
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Usuario', 'Email', 'Rol', 'Estatus', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.name}</p>
                            {currentUser && u.id === currentUser.id && <p className="text-xs text-blue-400">Sesión activa</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{u.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge colorClass={ROLE_COLORS[u.role]} label={ROLE_LABELS[u.role]} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        colorClass={u.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}
                        label={u.status === 'active' ? 'Activo' : 'Inactivo'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Usuario" size="sm">
        <div className="space-y-4">
          <FormField label="Nombre Completo" required>
            <Input value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Juan Pérez" />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder="usuario@empresa.com" />
          </FormField>
          <FormField label="Contraseña" required>
            <Input type="password" value={form.password} onChange={(e) => f('password', e.target.value)} placeholder="••••••••" />
          </FormField>
          <FormField label="Rol" required>
            <Select value={form.role} onChange={(e) => f('role', e.target.value as Role)}>
              {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </FormField>
          {saveError && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{saveError}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors font-medium">
            {saving ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
