-- ========================================================
-- FreightFlow TMS - Supabase Schema (Etapa 2)
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles & Roles
create type user_role as enum ('admin', 'dispatcher', 'operator', 'finance', 'viewer');

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role user_role default 'dispatcher',
  phone text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Clients
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  tax_id text not null,
  email text,
  phone text,
  address text,
  credit_days integer default 30,
  credit_limit numeric(12, 2) default 0,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Drivers
create table public.drivers (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  license_number text not null,
  license_expiry date not null,
  phone text not null,
  status text default 'available' check (status in ('available', 'on_trip', 'rest', 'inactive')),
  rating numeric(3, 2) default 5.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Vehicles
create table public.vehicles (
  id uuid default uuid_generate_v4() primary key,
  unit_number text not null unique,
  plate text not null,
  brand text not null,
  model text not null,
  year integer not null,
  trailer_type text not null,
  odometer integer default 0,
  status text default 'available' check (status in ('available', 'in_transit', 'maintenance', 'out_of_service')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Trips
create type trip_status as enum ('pending', 'assigned', 'loading', 'in_transit', 'delivered', 'cancelled');

create table public.trips (
  id uuid default uuid_generate_v4() primary key,
  trip_number text not null unique,
  client_id uuid references public.clients(id),
  driver_id uuid references public.drivers(id),
  vehicle_id uuid references public.vehicles(id),
  origin text not null,
  destination text not null,
  cargo_description text not null,
  cargo_weight_kg numeric(10, 2),
  scheduled_departure timestamp with time zone,
  scheduled_arrival timestamp with time zone,
  agreed_rate numeric(12, 2) not null,
  status trip_status default 'pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Expenses
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  category text not null check (category in ('fuel', 'toll', 'viatics', 'maintenance', 'fine', 'other')),
  amount numeric(10, 2) not null,
  description text not null,
  date date not null,
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Maintenances
create table public.maintenances (
  id uuid default uuid_generate_v4() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  service_type text not null check (service_type in ('preventive', 'corrective', 'tire', 'inspection')),
  description text not null,
  cost numeric(10, 2) not null,
  service_date date not null,
  workshop_name text,
  status text default 'completed' check (status in ('scheduled', 'in_progress', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);