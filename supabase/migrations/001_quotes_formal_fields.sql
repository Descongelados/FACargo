-- ============================================================
-- Cotizaciones: campos para el PDF formal
-- Ejecutar en: Supabase > SQL Editor (solo en bases ya creadas con
-- un schema.sql anterior; en bases nuevas ya vienen en schema.sql)
-- ============================================================

alter table public.quotes
  add column if not exists guest_client_contact text,
  add column if not exists guest_client_address text,
  add column if not exists service_date         date,
  add column if not exists reference            text;
