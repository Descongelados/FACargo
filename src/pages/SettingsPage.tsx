import { Settings, Database, Globe, Bell, Shield, ChevronRight } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { APP_NAME } from '../constants';

export default function SettingsPage() {
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
              {[
                { label: 'Nombre del Sistema', value: APP_NAME },
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

          {/* Supabase (próxima etapa) */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> Base de Datos — Supabase
            </h2>
            <p className="text-xs text-slate-500 mb-4">Disponible en la V2 del sistema</p>
            <div className="space-y-3">
              {[
                { label: 'VITE_SUPABASE_URL', value: 'No configurado', status: false },
                { label: 'VITE_SUPABASE_ANON_KEY', value: 'No configurado', status: false },
              ].map(({ label, value, status }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <span className="text-sm font-mono text-slate-400">{label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400">
                ⚠️ La aplicación actualmente usa <strong>datos en memoria (mock)</strong>. Los datos se reinician al recargar la página.
                En la V2 se integrará Supabase para persistencia real.
              </p>
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
