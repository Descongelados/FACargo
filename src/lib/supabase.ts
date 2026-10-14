import { createClient } from '@supabase/supabase-js';

// VITE_TMS_* tiene prioridad: Bolt administra (y bloquea) VITE_SUPABASE_* con su propia base.
const supabaseUrl = (import.meta.env.VITE_TMS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) as string;
const supabaseAnonKey = (import.meta.env.VITE_TMS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example como .env y rellena los valores de tu proyecto Supabase.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
