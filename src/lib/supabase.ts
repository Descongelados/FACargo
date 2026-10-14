import { createClient } from '@supabase/supabase-js';
import { useNotifyStore } from '../store/useNotifyStore';

// VITE_TMS_* tiene prioridad: Bolt administra (y bloquea) VITE_SUPABASE_* con su propia base.
const supabaseUrl = (import.meta.env.VITE_TMS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) as string;
const supabaseAnonKey = (import.meta.env.VITE_TMS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example como .env y rellena los valores de tu proyecto Supabase.'
  );
}

// Los stores descartan el error de cada operación; aquí se avisa al usuario en un solo punto.
const fetchWithErrors: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!res.ok && url.includes('/rest/v1/')) {
    const table = url.split('/rest/v1/')[1]?.split('?')[0] ?? '';
    const method = (init?.method ?? 'GET').toUpperCase();
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.clone().json();
      detail = [body.message, body.details, body.hint].filter(Boolean).join(' — ') || detail;
    } catch { /* respuesta sin JSON */ }
    useNotifyStore.getState().notifyError(`No se pudo completar (${method} ${table}): ${detail}`);
  }
  return res;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithErrors },
});
