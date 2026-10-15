import { useState, useEffect } from 'react';
import { Settings, Database, Globe, Bell, Pencil, Check, X, Wifi, WifiOff, Loader } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { supabase } from '../lib/supabase';

type DbStatus = 'checking' | 'connected' | 'error' | 'unconfigured';

export default function SettingsPage() {
  const { currentUser } = useAuthStore();
  const { systemName, setSystemName } = useSettingsStore();
  const isAdmin = currentUser?.role === 'admin';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(systemName);

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
    if (draft.trim()) {
      setSystemName(draft.trim());
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(systemName);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Parámetros generales del sistema"
        icon={Settings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info del sistema */}
        <div className="lg:col-span-2 space-y-4">
          {/* General */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> General
            </h2>
            <div className="space-y-3">
              {/* Nombre del Sistema — editable para admin */}
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

          {/* Supabase — estado de conexión */}
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

              {/* Estado de conexión */}
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

        {/* Sidebar de configuración */}
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
    </div>
  );
}
