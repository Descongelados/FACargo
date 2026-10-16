import { useState, useEffect, useRef } from 'react';
import {
  Settings, Database, Globe, Bell, Pencil, Check, X,
  Wifi, WifiOff, Loader, ImagePlus, Trash2,
  Shield, UserPlus,
  FileText, Plus, RotateCcw, Palette,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore, DEFAULT_QUOTE_CONFIG } from '../store/useSettingsStore';
import type { QuoteConfig } from '../store/useSettingsStore';
import { useNotifyStore } from '../store/useNotifyStore';
import { supabase } from '../lib/supabase';
import StatusBadge from '../components/ui/StatusBadge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/FormElements';
import { ROLE_LABELS } from '../constants/roles';
import { Role } from '../types';

type DbStatus = 'checking' | 'connected' | 'error' | 'unconfigured';
type Tab = 'general' | 'quote' | 'users';

const ROLE_COLORS: Record<Role, string> = {
  admin:      'bg-purple-500/20 text-purple-400 border-purple-500/30',
  dispatcher: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  operator:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  finance:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  viewer:     'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'viewer' as Role };

// ─── Sub-componente: campo de texto simple ─────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-700/60 border border-slate-600 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-colors"
      />
    </div>
  );
}

// ─── Sub-componente: campo de color ───────────────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-slate-600 cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 bg-slate-700/60 border border-slate-600 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none font-mono transition-colors"
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { currentUser } = useAuthStore();
  const { systemName, setSystemName, logoUrl, setLogoUrl, quoteConfig, setQuoteConfig, resetQuoteConfig } = useSettingsStore();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>('general');

  // ── General tab ──────────────────────────────────────────────────────────────
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
      .then(({ error }) => setDbStatus(error ? 'error' : 'connected'));
  }, [isConfigured]);

  const handleSaveName = () => { if (draft.trim()) setSystemName(draft.trim()); setEditing(false); };
  const handleCancelName = () => { setDraft(systemName); setEditing(false); };

  // ── Quote config tab ─────────────────────────────────────────────────────────
  // Copia local del config para editar antes de guardar
  const [qc, setQc] = useState<QuoteConfig>(() => ({ ...quoteConfig }));
  // Sincronizar si el store cambia externamente
  useEffect(() => { setQc({ ...quoteConfig }); }, [quoteConfig]);

  const { notifySuccess } = useNotifyStore();

  const saveQuoteConfig = () => {
    setQuoteConfig(qc);
    notifySuccess('Configuración de cotización guardada correctamente.');
  };

  const updateFeature = (i: number, key: 'title' | 'sub', val: string) =>
    setQc((prev) => {
      const features = prev.features.map((f, idx) => idx === i ? { ...f, [key]: val } : f);
      return { ...prev, features };
    });

  const addFeature = () =>
    setQc((prev) => ({ ...prev, features: [...prev.features, { title: '', sub: '' }] }));

  const removeFeature = (i: number) =>
    setQc((prev) => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }));

  const updateCondition = (i: number, val: string) =>
    setQc((prev) => {
      const conditions = prev.conditions.map((c, idx) => idx === i ? val : c);
      return { ...prev, conditions };
    });

  const addCondition = () =>
    setQc((prev) => ({ ...prev, conditions: [...prev.conditions, ''] }));

  const removeCondition = (i: number) =>
    setQc((prev) => ({ ...prev, conditions: prev.conditions.filter((_, idx) => idx !== i) }));

  // ── Users tab ─────────────────────────────────────────────────────────────────
  const { users, addUser, loadUsers } = useAuthStore();
  // Cargar usuarios al montar el componente
  useEffect(() => { loadUsers(); }, []);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
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

  // ── Tabs visibles ─────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'quote',   label: 'Cotización' },
    ...(isAdmin ? [{ id: 'users' as Tab, label: 'Usuarios & Accesos' }] : []),
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────────────
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

      {/* ══════════════════════════════════════════════ PESTAÑA GENERAL */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        type="text" value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelName(); }}
                        autoFocus
                        className="bg-slate-700 border border-slate-600 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-1 outline-none w-52"
                      />
                      <button onClick={handleSaveName} className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={handleCancelName} className="p-1 rounded-md text-rose-400 hover:bg-rose-500/10 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{systemName}</span>
                      {isAdmin && (
                        <button onClick={() => { setDraft(systemName); setEditing(true); }} className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Logo */}
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
                        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoChange} />
                        <button onClick={() => fileInputRef.current?.click()} className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"><ImagePlus className="w-4 h-4" /></button>
                        {logoUrl && <button onClick={() => setLogoUrl(null)} className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                      </>
                    )}
                  </div>
                </div>

                {[
                  { label: 'Versión',      value: 'v1.0.0 — Stage 1 (Mock Data)' },
                  { label: 'Zona Horaria', value: 'America/Mexico_City (UTC-6)' },
                  { label: 'Idioma',       value: 'Español (México)' },
                  { label: 'Moneda',       value: 'MXN (Peso Mexicano)' },
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
                  { label: 'VITE_SUPABASE_URL',      configured: Boolean(supabaseUrl) },
                  { label: 'VITE_SUPABASE_ANON_KEY',  configured: Boolean(supabaseKey) },
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
                  {dbStatus === 'checking'    && <span className="flex items-center gap-1.5 text-xs text-slate-400"><Loader className="w-3.5 h-3.5 animate-spin" /> Verificando…</span>}
                  {dbStatus === 'connected'   && <span className="flex items-center gap-1.5 text-xs text-emerald-400"><Wifi className="w-3.5 h-3.5" /> Conectado</span>}
                  {dbStatus === 'error'       && <span className="flex items-center gap-1.5 text-xs text-rose-400"><WifiOff className="w-3.5 h-3.5" /> Sin conexión</span>}
                  {dbStatus === 'unconfigured'&& <span className="flex items-center gap-1.5 text-xs text-slate-500"><WifiOff className="w-3.5 h-3.5" /> No configurado</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" /> Notificaciones
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Alertas de vencimiento de licencias', enabled: true },
                  { label: 'Notificaciones de mantenimiento',     enabled: true },
                  { label: 'Resumen diário por email',            enabled: false },
                ].map(({ label, enabled }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{label}</span>
                    <div className={`w-8 h-4 rounded-full ${enabled ? 'bg-blue-600' : 'bg-slate-600'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white shadow mt-0.5 transition-transform ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Roadmap del Sistema</h2>
              <div className="space-y-2">
                {[
                  { version: 'V1', label: 'Módulos base + Mock', done: true },
                  { version: 'V2', label: 'Supabase + Auth',     done: false },
                  { version: 'V3', label: 'Evidencias + PDF',    done: false },
                  { version: 'V4', label: 'GPS y geolocaliz.',   done: false },
                  { version: 'V5', label: 'App móvil + CFDI',    done: false },
                ].map(({ version, label, done }) => (
                  <div key={version} className={`flex items-center gap-2 p-2.5 rounded-lg ${done ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-700/30'}`}>
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

      {/* ══════════════════════════════════════════════ PESTAÑA COTIZACIÓN */}
      {activeTab === 'quote' && (
        <div className="space-y-6">
          {/* Barra de acciones */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Personaliza el contenido y diseño del PDF de cotización.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetQuoteConfig();
                  setQc({ ...DEFAULT_QUOTE_CONFIG });
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar
              </button>
              <button
                onClick={saveQuoteConfig}
                className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
              >
                <Check className="w-3.5 h-3.5" /> Guardar cambios
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Col izq: Encabezado + Colores + Contacto */}
            <div className="space-y-5">

              {/* Encabezado */}
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" /> Encabezado del PDF
                </h3>
                <div className="space-y-3">
                  <Field label="Nombre de la empresa" value={qc.companyName} onChange={(v) => setQc((p) => ({ ...p, companyName: v }))} placeholder="Mi Empresa S.A." />
                  <Field label="Slogan" value={qc.slogan} onChange={(v) => setQc((p) => ({ ...p, slogan: v }))} placeholder="LOGÍSTICA A TU MEDIDA" />
                </div>
              </div>

              {/* Colores */}
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-400" /> Colores Corporativos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Color principal (encabezado / secciones)" value={qc.primaryColor} onChange={(v) => setQc((p) => ({ ...p, primaryColor: v }))} />
                  <ColorField label="Color acento (total / bullets)" value={qc.accentColor} onChange={(v) => setQc((p) => ({ ...p, accentColor: v }))} />
                </div>
                {/* Preview de colores */}
                <div className="flex gap-3 mt-3">
                  <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: qc.primaryColor }}>
                    Principal
                  </div>
                  <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: qc.accentColor }}>
                    Acento
                  </div>
                </div>
              </div>

              {/* Contacto footer */}
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" /> Datos de Contacto (Footer)
                </h3>
                <div className="space-y-3">
                  <Field label="Teléfono"   value={qc.phone}   onChange={(v) => setQc((p) => ({ ...p, phone: v }))}   placeholder="+52 33 1234 5678" />
                  <Field label="Email"      value={qc.email}   onChange={(v) => setQc((p) => ({ ...p, email: v }))}   placeholder="contacto@empresa.com" />
                  <Field label="Sitio web"  value={qc.website} onChange={(v) => setQc((p) => ({ ...p, website: v }))} placeholder="www.empresa.com" />
                  <Field label="Dirección de la empresa" value={qc.address} onChange={(v) => setQc((p) => ({ ...p, address: v }))} placeholder="Guadalajara, Jalisco, México" />
                  <Field label="WhatsApp (para el QR; si se deja vacío se usa el teléfono)" value={qc.whatsapp} onChange={(v) => setQc((p) => ({ ...p, whatsapp: v }))} placeholder="+52 33 1234 5678" />
                  <Field label="Tagline derecho" value={qc.footerTagline} onChange={(v) => setQc((p) => ({ ...p, footerTagline: v }))} placeholder="TU ALIADO EN EL CAMINO" />
                  <Field label="Sub-footer central" value={qc.footerSubline} onChange={(v) => setQc((p) => ({ ...p, footerSubline: v }))} placeholder="FLETES | CARGA | LOGÍSTICA" />
                </div>
              </div>

              {/* Datos fiscales y bancarios */}
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" /> Datos Fiscales y Bancarios
                </h3>
                <div className="space-y-3">
                  <Field label="Razón social / Titular de la cuenta" value={qc.legalName} onChange={(v) => setQc((p) => ({ ...p, legalName: v }))} placeholder="Mi Empresa S.A. de C.V." />
                  <Field label="RFC" value={qc.rfc} onChange={(v) => setQc((p) => ({ ...p, rfc: v.toUpperCase() }))} placeholder="XAXX010101000" />
                  <Field label="Banco" value={qc.bankName} onChange={(v) => setQc((p) => ({ ...p, bankName: v }))} placeholder="BBVA" />
                  <Field label="Número de cuenta" value={qc.bankAccount} onChange={(v) => setQc((p) => ({ ...p, bankAccount: v }))} placeholder="0123456789" />
                  <Field label="CLABE interbancaria" value={qc.bankClabe} onChange={(v) => setQc((p) => ({ ...p, bankClabe: v.replace(/\D/g, '') }))} placeholder="18 dígitos" />
                  {qc.bankClabe && qc.bankClabe.length !== 18 && (
                    <p className="text-xs text-amber-400">La CLABE debe tener 18 dígitos ({qc.bankClabe.length}/18).</p>
                  )}
                  <p className="text-xs text-slate-500">Si se dejan vacíos, el PDF omite el recuadro de datos bancarios.</p>
                </div>
              </div>

              {/* Firma */}
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-pink-400" /> Firma de la Cotización
                </h3>
                <div className="space-y-3">
                  <Field label="Nombre del responsable" value={qc.signerName} onChange={(v) => setQc((p) => ({ ...p, signerName: v }))} placeholder="Carlos Díaz" />
                  <Field label="Cargo" value={qc.signerTitle} onChange={(v) => setQc((p) => ({ ...p, signerTitle: v }))} placeholder="Gerente Comercial" />
                </div>
              </div>

              {/* Porcentajes */}
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" /> Desglose de Costos
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'IVA (%)',         key: 'ivaPercent' as const },
                    { label: 'Casetas (%)',      key: 'tollPercent' as const },
                    { label: 'Maniobras (%)',    key: 'maneuverPercent' as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                      <input
                        type="number" min={0} max={100} step={0.5}
                        value={qc[key]}
                        onChange={(e) => setQc((p) => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-slate-700/60 border border-slate-600 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">Los porcentajes de Casetas y Maniobras se calculan sobre el flete base.</p>
                <p className="text-xs text-slate-500 mt-1">En las condiciones puedes usar <code className="text-slate-400">{'{transito}'}</code> (tiempo estimado según la distancia) y <code className="text-slate-400">{'{vigencia}'}</code> (días de vigencia); se reemplazan con los datos de cada cotización.</p>
              </div>
            </div>

            {/* ── Col der: Características + Condiciones */}
            <div className="space-y-5">

              {/* Características */}
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Características (franja PDF)
                  </h3>
                  <button
                    onClick={addFeature}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {qc.features.map((feat, i) => (
                    <div key={i} className="bg-slate-700/40 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">#{i + 1}</span>
                        <button onClick={() => removeFeature(i)} className="p-1 text-slate-500 hover:text-rose-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text" value={feat.title} placeholder="Título"
                        onChange={(e) => updateFeature(i, 'title', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 text-white text-xs rounded-md px-2.5 py-1.5 outline-none"
                      />
                      <input
                        type="text" value={feat.sub} placeholder="Subtítulo"
                        onChange={(e) => updateFeature(i, 'sub', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 focus:border-blue-500 text-slate-300 text-xs rounded-md px-2.5 py-1.5 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Condiciones comerciales */}
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-400" /> Condiciones Comerciales
                  </h3>
                  <button
                    onClick={addCondition}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {qc.conditions.map((cond, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-slate-500 mt-2 w-5 shrink-0">{i + 1}.</span>
                      <textarea
                        value={cond}
                        onChange={(e) => updateCondition(i, e.target.value)}
                        rows={2}
                        className="flex-1 bg-slate-700/60 border border-slate-600 focus:border-blue-500 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none resize-none"
                      />
                      <button onClick={() => removeCondition(i)} className="p-1.5 mt-0.5 text-slate-500 hover:text-rose-400 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Guardar al fondo también */}
          <div className="flex justify-end">
            <button
              onClick={saveQuoteConfig}
              className="flex items-center gap-2 px-5 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
            >
              <Check className="w-4 h-4" /> Guardar configuración de cotización
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ PESTAÑA USUARIOS */}
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
                    { label: 'Ver Dashboard',          key: 'viewDashboard' },
                    { label: 'Gestionar Viajes',        key: 'manageTrips' },
                    { label: 'Gestionar Clientes',      key: 'manageClients' },
                    { label: 'Gestionar Operadores',    key: 'manageDrivers' },
                    { label: 'Gestionar Unidades',      key: 'manageVehicles' },
                    { label: 'Gestionar Gastos',        key: 'manageExpenses' },
                    { label: 'Mantenimientos',          key: 'manageMaintenance' },
                    { label: 'Ver Reportes',            key: 'viewReports' },
                    { label: 'Gestionar Usuarios',      key: 'manageUsers' },
                    { label: 'Configuración',           key: 'manageSettings' },
                  ].map(({ label, key }) => (
                    <tr key={key}>
                      <td className="py-2 pr-4 text-slate-400">{label}</td>
                      {(['admin', 'dispatcher', 'operator', 'finance', 'viewer'] as Role[]).map(role => {
                        const perms: Record<string, Record<string, boolean>> = {
                          admin:      { viewDashboard:true,  manageTrips:true,  manageClients:true,  manageDrivers:true,  manageVehicles:true,  manageExpenses:true,  manageMaintenance:true,  viewReports:true,  manageUsers:true,  manageSettings:true },
                          dispatcher: { viewDashboard:true,  manageTrips:true,  manageClients:true,  manageDrivers:true,  manageVehicles:true,  manageExpenses:false, manageMaintenance:false, viewReports:false, manageUsers:false, manageSettings:false },
                          operator:   { viewDashboard:true,  manageTrips:false, manageClients:false, manageDrivers:false, manageVehicles:false, manageExpenses:true,  manageMaintenance:false, viewReports:false, manageUsers:false, manageSettings:false },
                          finance:    { viewDashboard:true,  manageTrips:false, manageClients:true,  manageDrivers:false, manageVehicles:false, manageExpenses:true,  manageMaintenance:true,  viewReports:true,  manageUsers:false, manageSettings:false },
                          viewer:     { viewDashboard:true,  manageTrips:false, manageClients:false, manageDrivers:false, manageVehicles:false, manageExpenses:false, manageMaintenance:false, viewReports:true,  manageUsers:false, manageSettings:false },
                        };
                        const allowed = perms[role][key];
                        return (
                          <td key={role} className="px-3 py-2 text-center">
                            {allowed ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">—</span>}
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
                        <td className="px-4 py-3"><StatusBadge colorClass={ROLE_COLORS[u.role]} label={ROLE_LABELS[u.role]} /></td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            colorClass={u.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}
                            label={u.status === 'active' ? 'Activo' : 'Inactivo'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
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
            <Input value={form.name}     onChange={(e) => f('name', e.target.value)}     placeholder="Juan Pérez" />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" value={form.email}    onChange={(e) => f('email', e.target.value)}    placeholder="usuario@empresa.com" />
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
          {saveError && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{saveError}</p>}
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
