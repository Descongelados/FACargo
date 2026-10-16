-- ============================================================
-- Viajes: vínculo con la cotización de origen
-- Ejecutar en: Supabase > SQL Editor (solo en bases ya creadas;
-- en bases nuevas ya viene en schema.sql)
-- ============================================================

alter table public.trips
  add column if not exists quote_id uuid;

alter table public.trips
  drop constraint if exists trips_quote_id_fkey;
alter table public.trips
  add constraint trips_quote_id_fkey foreign key (quote_id) references public.quotes(id) on delete set null;

create index if not exists idx_trips_quote_id on public.trips(quote_id);

-- Rellena los viajes ya generados desde una cotización (según las notas)
update public.trips t
set quote_id = q.id
from public.quotes q
where t.quote_id is null
  and t.notes = 'Generado desde cotización ' || q.quote_number;
