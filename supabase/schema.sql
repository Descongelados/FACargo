-- ============================================================
-- FACargo — Supabase Schema completo
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role          as enum ('admin', 'dispatcher', 'operator', 'finance', 'viewer');
create type driver_status      as enum ('available', 'on_trip', 'rest', 'inactive');
create type vehicle_status     as enum ('available', 'in_transit', 'maintenance', 'out_of_service');
create type trailer_type       as enum (
  'Dry Van (Caja Seca)',
  'Reefer (Refrigerado)',
  'Flatbed (Plataforma)',
  'Tanker (Pipa)',
  'Lowboy'
);
create type trip_status        as enum ('pending', 'assigned', 'loading', 'in_transit', 'delivered', 'cancelled');
create type quote_status       as enum ('draft', 'sent', 'approved', 'rejected');
create type expense_category   as enum ('fuel', 'toll', 'viatics', 'maintenance', 'fine', 'other');
create type maintenance_type   as enum ('preventive', 'corrective', 'tire', 'inspection');
create type maintenance_status as enum ('scheduled', 'in_progress', 'completed');
create type insurance_coverage as enum ('rc', 'damage', 'theft', 'cargo', 'medical', 'full');
create type accounting_entry_type     as enum ('income', 'expense', 'adjustment');
create type accounting_entry_category as enum (
  'freight_revenue',
  'fuel',
  'tolls',
  'viatics',
  'maintenance',
  'insurance',
  'salaries',
  'admin',
  'taxes',
  'financing',
  'other_income',
  'other_expense'
);
create type period_status as enum ('open', 'closed');

-- ============================================================
-- 1. PROFILES  (extiende auth.users de Supabase Auth)
-- ============================================================

create table public.profiles (
  id          uuid        references auth.users on delete cascade primary key,
  full_name   text        not null,
  role        user_role   not null default 'dispatcher',
  phone       text,
  avatar_url  text,
  status      text        not null default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger: crear perfil automáticamente al registrar usuario en Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'dispatcher')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: actualizar updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- 2. CLIENTS
-- ============================================================

create table public.clients (
  id            uuid        primary key default uuid_generate_v4(),
  name          text        not null,
  tax_id        text        not null,
  contact_name  text,
  email         text,
  phone         text,
  address       text,
  credit_days   integer     not null default 30,
  credit_limit  numeric(12,2) not null default 0,
  status        text        not null default 'active' check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute procedure public.set_updated_at();

create index idx_clients_status on public.clients(status);

-- ============================================================
-- 3. DRIVERS
-- ============================================================

create table public.drivers (
  id                  uuid          primary key default uuid_generate_v4(),
  full_name           text          not null,
  license_number      text          not null unique,
  license_expiry      date          not null,
  phone               text          not null,
  emergency_contact   text,
  status              driver_status not null default 'available',
  assigned_vehicle_id uuid,         -- FK añadida después de vehicles
  rating              numeric(3,2)  not null default 5.0,
  total_trips         integer       not null default 0,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now()
);

create trigger trg_drivers_updated_at
  before update on public.drivers
  for each row execute procedure public.set_updated_at();

create index idx_drivers_status on public.drivers(status);

-- ============================================================
-- 4. VEHICLES
-- ============================================================

create table public.vehicles (
  id                    uuid           primary key default uuid_generate_v4(),
  unit_number           text           not null unique,
  plate                 text           not null,
  brand                 text           not null,
  model                 text           not null,
  year                  integer        not null,
  trailer_type          trailer_type   not null,
  odometer              integer        not null default 0,
  fuel_type             text           not null default 'Diesel' check (fuel_type in ('Diesel', 'Gasolina', 'Gas LP')),
  km_per_liter          numeric(6,2),
  status                vehicle_status not null default 'available',
  last_maintenance_date date,
  created_at            timestamptz    not null default now(),
  updated_at            timestamptz    not null default now()
);

create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute procedure public.set_updated_at();

create index idx_vehicles_status on public.vehicles(status);

-- FK diferida: drivers.assigned_vehicle_id → vehicles
alter table public.drivers
  add constraint fk_drivers_vehicle
  foreign key (assigned_vehicle_id) references public.vehicles(id) on delete set null;

-- ============================================================
-- 5. TRIPS
-- ============================================================

create table public.trips (
  id                  uuid        primary key default uuid_generate_v4(),
  trip_number         text        not null unique,
  client_id           uuid        not null references public.clients(id),
  driver_id           uuid        references public.drivers(id),
  vehicle_id          uuid        references public.vehicles(id),
  origin              text        not null,
  destination         text        not null,
  cargo_description   text        not null,
  cargo_weight_kg     numeric(10,2),
  departure_date      date,
  delivery_date       date,
  rate                numeric(12,2) not null default 0,
  distance_km         numeric(10,2) not null default 0,
  status              trip_status not null default 'pending',
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_trips_updated_at
  before update on public.trips
  for each row execute procedure public.set_updated_at();

create index idx_trips_status    on public.trips(status);
create index idx_trips_client_id on public.trips(client_id);
create index idx_trips_driver_id on public.trips(driver_id);
create index idx_trips_vehicle_id on public.trips(vehicle_id);

-- ============================================================
-- 6. QUOTES
-- ============================================================

create table public.quotes (
  id                   uuid         primary key default uuid_generate_v4(),
  quote_number         text         not null unique,
  client_id            uuid         references public.clients(id),
  guest_client_phone   text,
  guest_client_email   text,
  guest_client_contact text,
  guest_client_address text,
  vehicle_id           uuid         references public.vehicles(id),
  origin               text         not null,
  destination          text         not null,
  cargo_description    text         not null,
  cargo_weight_kg      numeric(10,2),
  distance_km          numeric(10,2) not null default 0,
  trailer_type         trailer_type not null,
  proposed_rate        numeric(12,2) not null default 0,
  valid_until          date         not null,
  service_date         date,
  reference            text,
  status               quote_status not null default 'draft',
  notes                text,
  created_at           timestamptz  not null default now(),
  updated_at           timestamptz  not null default now()
);

create trigger trg_quotes_updated_at
  before update on public.quotes
  for each row execute procedure public.set_updated_at();

create index idx_quotes_status    on public.quotes(status);
create index idx_quotes_client_id on public.quotes(client_id);

-- ============================================================
-- 7. EXPENSES
-- ============================================================

create table public.expenses (
  id              uuid              primary key default uuid_generate_v4(),
  trip_id         uuid              references public.trips(id) on delete set null,
  category        expense_category  not null,
  description     text              not null,
  amount          numeric(10,2)     not null,
  date            date              not null,
  vendor          text,
  invoice_number  text,
  receipt_url     text,
  created_at      timestamptz       not null default now(),
  updated_at      timestamptz       not null default now()
);

create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute procedure public.set_updated_at();

create index idx_expenses_trip_id  on public.expenses(trip_id);
create index idx_expenses_category on public.expenses(category);
create index idx_expenses_date     on public.expenses(date);

-- ============================================================
-- 8. MAINTENANCES
-- ============================================================

create table public.maintenances (
  id                       uuid               primary key default uuid_generate_v4(),
  vehicle_id               uuid               not null references public.vehicles(id) on delete cascade,
  type                     maintenance_type   not null,
  description              text               not null,
  workshop                 text,
  cost                     numeric(10,2)      not null default 0,
  date                     date               not null,
  status                   maintenance_status not null default 'scheduled',
  next_scheduled_odometer  integer,
  created_at               timestamptz        not null default now(),
  updated_at               timestamptz        not null default now()
);

create trigger trg_maintenances_updated_at
  before update on public.maintenances
  for each row execute procedure public.set_updated_at();

create index idx_maintenances_vehicle_id on public.maintenances(vehicle_id);
create index idx_maintenances_status     on public.maintenances(status);

-- ============================================================
-- 9. INSURANCE POLICIES
-- ============================================================

create table public.insurance_policies (
  id              uuid               primary key default uuid_generate_v4(),
  vehicle_id      uuid               not null references public.vehicles(id) on delete cascade,
  policy_number   text               not null,
  insurer         text               not null,
  coverage        insurance_coverage not null,
  annual_premium  numeric(12,2)      not null,
  monthly_payment numeric(12,2),
  start_date      date               not null,
  end_date        date               not null,
  contact_name    text,
  contact_phone   text,
  notes           text,
  created_at      timestamptz        not null default now(),
  updated_at      timestamptz        not null default now()
);

create trigger trg_insurance_updated_at
  before update on public.insurance_policies
  for each row execute procedure public.set_updated_at();

create index idx_insurance_vehicle_id on public.insurance_policies(vehicle_id);
create index idx_insurance_end_date   on public.insurance_policies(end_date);

-- ============================================================
-- 10. ACCOUNTING PERIODS
-- ============================================================

create table public.accounting_periods (
  id               text          primary key,  -- formato: "per-YYYY-MM"
  year             integer       not null,
  month            integer       not null check (month between 1 and 12),
  status           period_status not null default 'open',
  opening_balance  numeric(14,2) not null default 0,
  closed_at        timestamptz,
  closed_by        uuid          references public.profiles(id),
  notes            text,
  created_at       timestamptz   not null default now(),
  unique (year, month)
);

create index idx_periods_year_month on public.accounting_periods(year, month);

-- ============================================================
-- 11. ACCOUNTING ENTRIES
-- ============================================================

create table public.accounting_entries (
  id                uuid                        primary key default uuid_generate_v4(),
  period_id         text                        not null references public.accounting_periods(id) on delete cascade,
  type              accounting_entry_type       not null,
  category          accounting_entry_category   not null,
  description       text                        not null,
  amount            numeric(14,2)               not null,
  date              date                        not null,
  reference         text,
  notes             text,
  is_auto_generated boolean                     not null default false,
  created_at        timestamptz                 not null default now(),
  updated_at        timestamptz                 not null default now()
);

create trigger trg_accounting_entries_updated_at
  before update on public.accounting_entries
  for each row execute procedure public.set_updated_at();

create index idx_acc_entries_period_id on public.accounting_entries(period_id);
create index idx_acc_entries_type      on public.accounting_entries(type);
create index idx_acc_entries_date      on public.accounting_entries(date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
alter table public.profiles           enable row level security;
alter table public.clients            enable row level security;
alter table public.drivers            enable row level security;
alter table public.vehicles           enable row level security;
alter table public.trips              enable row level security;
alter table public.quotes             enable row level security;
alter table public.expenses           enable row level security;
alter table public.maintenances       enable row level security;
alter table public.insurance_policies enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.accounting_entries enable row level security;

-- ── Helper: obtener rol del usuario autenticado ──────────────
create or replace function public.current_user_role()
returns user_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── PROFILES ──────────────────────────────────────────────────
-- Cualquier usuario autenticado puede ver perfiles
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

-- Cada usuario puede actualizar su propio perfil; admin puede actualizar cualquiera
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin')
  with check (id = auth.uid() or public.current_user_role() = 'admin');

-- Solo admin puede insertar perfiles directamente
create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (public.current_user_role() = 'admin');

-- Solo admin puede eliminar perfiles
create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- ── POLÍTICA GENÉRICA: authenticated puede leer todo ──────────
-- Aplica a: clients, drivers, vehicles, trips, quotes, expenses,
--           maintenances, insurance_policies, accounting_periods, accounting_entries

create policy "clients_select"            on public.clients            for select to authenticated using (true);
create policy "drivers_select"            on public.drivers            for select to authenticated using (true);
create policy "vehicles_select"           on public.vehicles           for select to authenticated using (true);
create policy "trips_select"              on public.trips              for select to authenticated using (true);
create policy "quotes_select"             on public.quotes             for select to authenticated using (true);
create policy "expenses_select"           on public.expenses           for select to authenticated using (true);
create policy "maintenances_select"       on public.maintenances       for select to authenticated using (true);
create policy "insurance_select"          on public.insurance_policies for select to authenticated using (true);
create policy "acc_periods_select"        on public.accounting_periods for select to authenticated using (true);
create policy "acc_entries_select"        on public.accounting_entries for select to authenticated using (true);

-- ── ESCRITURA: roles con permiso de modificar datos ───────────
-- admin + dispatcher pueden gestionar clientes, viajes, cotizaciones, gastos
-- admin + finance pueden gestionar contabilidad
-- admin puede gestionar todo

create policy "clients_write" on public.clients
  for all to authenticated
  using (public.current_user_role() in ('admin', 'dispatcher'))
  with check (public.current_user_role() in ('admin', 'dispatcher'));

create policy "drivers_write" on public.drivers
  for all to authenticated
  using (public.current_user_role() in ('admin', 'dispatcher'))
  with check (public.current_user_role() in ('admin', 'dispatcher'));

create policy "vehicles_write" on public.vehicles
  for all to authenticated
  using (public.current_user_role() in ('admin', 'dispatcher', 'operator'))
  with check (public.current_user_role() in ('admin', 'dispatcher', 'operator'));

create policy "trips_write" on public.trips
  for all to authenticated
  using (public.current_user_role() in ('admin', 'dispatcher'))
  with check (public.current_user_role() in ('admin', 'dispatcher'));

create policy "quotes_write" on public.quotes
  for all to authenticated
  using (public.current_user_role() in ('admin', 'dispatcher'))
  with check (public.current_user_role() in ('admin', 'dispatcher'));

create policy "expenses_write" on public.expenses
  for all to authenticated
  using (public.current_user_role() in ('admin', 'dispatcher', 'operator', 'finance'))
  with check (public.current_user_role() in ('admin', 'dispatcher', 'operator', 'finance'));

create policy "maintenances_write" on public.maintenances
  for all to authenticated
  using (public.current_user_role() in ('admin', 'dispatcher', 'operator'))
  with check (public.current_user_role() in ('admin', 'dispatcher', 'operator'));

create policy "insurance_write" on public.insurance_policies
  for all to authenticated
  using (public.current_user_role() in ('admin', 'finance'))
  with check (public.current_user_role() in ('admin', 'finance'));

create policy "acc_periods_write" on public.accounting_periods
  for all to authenticated
  using (public.current_user_role() in ('admin', 'finance'))
  with check (public.current_user_role() in ('admin', 'finance'));

create policy "acc_entries_write" on public.accounting_entries
  for all to authenticated
  using (public.current_user_role() in ('admin', 'finance'))
  with check (public.current_user_role() in ('admin', 'finance'));
