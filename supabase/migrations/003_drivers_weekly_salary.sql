-- ============================================================
-- Operadores: sueldo semanal (se usa en el costo estimado de cotizaciones)
-- Ejecutar en: Supabase > SQL Editor (solo en bases ya creadas;
-- en bases nuevas ya viene en schema.sql)
-- ============================================================

alter table public.drivers
  add column if not exists weekly_salary numeric(12,2) not null default 0;

-- Refresca el caché de esquema de la API
notify pgrst, 'reload schema';
