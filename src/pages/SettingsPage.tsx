import { useState, useEffect, useRef } from 'react';
import { Settings, Database, Globe, Bell, Pencil, Check, X, Wifi, WifiOff, Loader, ImagePlus, Trash2, Shield, UserPlus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { supabase } from '../lib/supabase';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { ROLE_LABELS } from '../constants/roles';
import { Role } from '../types';

type DbStatus = 'checking' | 'connected' | 'error' | 'unconfigured';
type Tab = 'general' | 'users';

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  dispatcher: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  operator: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  finance: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  viewer: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'viewer' as Role };

export default function SettingsPage() {
  const { currentUser } = useAuthStore();
  const { systemName, setSystemName, logoUrl, setLogoUrl } = useSettingsStore();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>('general');

  // --- General tab state ---
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(systemName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const supabaseUrl = import.meta.env.VITE_TMS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_TMS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const isConfigured = Boolean(supabaseUrl && supabaseKey);

  const [dbStatus, setDbStatus] = useState<DbStatus>(isConfigured ? 'checking' : 'unconfigured');

  useEffect(() => {
    if (!isConfigured) { setDbStatus('unconfigured'); return; }
    setDbStatus('checking');
    void supabase.from('profiles').select('id', { count: 'exact', head: true })
      .then(({ error }) => { setDbStatus(error ? 'error' : 'connected'); });
  }, [isConfigured]);

  const handleSave = () => {
    if (draft.trim()) setSystemName(draft.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(systemName);
    setEditing(false);
  };

  // --- Users tab state ---
  const { users, addUser, loadUsers } = useAuthStore();
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
  const handleSaveUser = async () => {
    setSaving(true);
    const err = await addUser(form.email, form.password, form.name, form.role);
    setSaving(false);
    if (err) { setSaveError(err); return; }
    await loadUsers();
    setIsModalOpen(false);
  };
  const f = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const TABS: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    ...(isAdmin ? [{ id: 'users' as Tab, label: 'Usuarios & Accesos' }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Parámetros generales del sistema"
        icon={Settings}
        {...(activeTab === 'users' && isAdmin
          ? { action: { label: 'Nuevo Usuario', onClick: openAdd, icon: UserPlus } }
          : {})}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white border border-b-slate-800 border-slate-700/50 -mb-px'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PESTAÑA GENERAL ── */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info del sistema */}
          <div className="lg:col-span-2 space-y-4">
            {/* General */}
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> General
              </h2>
              <div className="space-y-3">
                {/* Nombre del Sistema */}
                <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-sm text-slate-400">Nombre del Sistema</span>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                        autoFocus
                        className="bg-slate-700 border border-slate-600 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-1 outline-none w-52"
                      />
                      <button onClick={handleSave} title="Guardar" className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={handleCancel} title="Cancelar" className="p-1 rounded-md text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{systemName}</span>
                      {isAdmin && (
                        <button
                          onClick={() => { setDraft(systemName); setEditing(true); }}
                          title="Editar nombre del sistema"
                          className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Logo del sistema */}
                <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-sm text-slate-400">Logo del Sistema</span>
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain rounded" />
                    ) : (
                      <span className="text-xs text-slate-500">Sin logo</span>
                    )}
                    {isAdmin && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          title="Subir logo"
                          className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                        >
                          <ImagePlus className="w-4 h-4" />
                        </button>
                        {logoUrl && (
                          <button
                            onClick={() => setLogoUrl(null)}
                            title="Quitar logo"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {[
                  { label: 'Versión', value: 'v1.0.0 — Stage 1 (Mock Data)' },
                  { label: 'Zona Horaria', value: 'America/Mexico_City (UTC-6)' },
                  { label: 'Idioma', value: 'Español (México)' },
                  { label: 'Moneda', value: 'MXN (Peso Mexicano)' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-sm text-slate-400">{label}</span>
                    <span className="text-sm text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supabase */}
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" /> Base de Datos — Supabase
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'VITE_SUPABASE_URL', configured: Boolean(supabaseUrl) },
                  { label: 'VITE_SUPABASE_ANON_KEY', configured: Boolean(supabaseKey) },
                ].map(({ label, configured }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-sm font-mono text-slate-400">{label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${configured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                      {configured ? 'Configurado' : 'No configurado'}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm text-slate-400">Estado de conexión</span>
                  {dbStatus === 'checking' && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Loader className="w-3.5 h-3.5 animate-spin" /> Verificando…
                    </span>
                  )}
                  {dbStatus === 'connected' && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <Wifi className="w-3.5 h-3.5" /> Conectado
                    </span>
                  )}
                  {dbStatus === 'error' && (
                    <span className="flex items-center gap-1.5 text-xs text-rose-400">
                      <WifiOff className="w-3.5 h-3.5" /> Sin conexión
                    </span>
                  )}
                  {dbStatus === 'unconfigured' && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <WifiOff className="w-3.5 h-3.5" /> No configurado
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Notificaciones */}
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" /> Notificaciones
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Alertas de vencimiento de licencias', enabled: true },
                  { label: 'Notificaciones de mantenimiento', enabled: true },
                  { label: 'Resumen diário por email', enabled: false },
                ].map(({ label, enabled }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{label}</span>
                    <div className={`w-8 h-4 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-600'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white shadow mt-0.5 transition-transform ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Roadmap */}
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Roadmap del Sistema</h2>
              <div className="space-y-2">
                {[
                  { version: 'V1', label: 'Módulos base + Mock', done: true },
                  { version: 'V2', label: 'Supabase + Auth', done: false },
                  { version: 'V3', label: 'Evidencias + PDF', done: false },
                  { version: 'V4', label: 'GPS y geolocaliz.', done: false },
                  { version: 'V5', label: 'App móvil + CFDI', done: false },
                ].map(({ version, label, done }) => (
                  <div key={version} className={`flex items-center gap-2 p-2.5 rounded-lg ${
                    done ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-700/30'
                  }`}>
                    <span className={`text-xs font-bold w-7 text-center ${done ? 'text-emerald-400' : 'text-slate-500'}`}>{version}</span>
                    <span className={`text-xs flex-1 ${done ? 'text-emerald-300' : 'text-slate-400'}`}>{label}</span>
                    {done && <span className="text-xs text-emerald-400">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PESTAÑA USUARIOS ── */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o email..." />
            </div>
          </div>

          {/* Matriz de permisos */}
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

          {/* Lista de usuarios */}
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
        </div>
      )}

      {/* Modal nuevo usuario */}
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
          <button onClick={handleSaveUser} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors font-medium">
            {saving ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
