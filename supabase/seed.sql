-- ============================================================
-- FACargo — Seed inicial
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================
-- NOTA: Este seed solo inserta datos de prueba en tablas que
--       no dependen de auth.users (clientes, vehículos, conductores).
--       El perfil admin se crea automáticamente al registrar
--       el primer usuario en Supabase Auth.
-- ============================================================

-- ── Clientes ─────────────────────────────────────────────────
insert into public.clients (name, tax_id, contact_name, email, phone, address, credit_days, credit_limit, status)
values
  ('Distribuidora Norte S.A.', 'DNO-123456', 'Carlos Mendoza', 'carlos@dnorte.mx', '664-555-0101', 'Av. Industrial 45, Tijuana, BC', 30, 150000, 'active'),
  ('Logística del Pacífico', 'LDP-789012', 'Ana García', 'ana@logipac.mx', '664-555-0202', 'Blvd. Agua Caliente 1000, Tijuana, BC', 45, 200000, 'active'),
  ('Exportaciones Baja S.C.', 'EBS-345678', 'Roberto López', 'rlopez@expbaja.mx', '664-555-0303', 'Zona Industrial Otay, Tijuana, BC', 15, 80000, 'active'),
  ('Maquiladora Premier', 'MPR-901234', 'Sandra Torres', 'storres@premier.mx', '664-555-0404', 'Parque Industrial La Mesa, Tijuana, BC', 30, 120000, 'active'),
  ('Transportes del Valle', 'TDV-567890', 'Miguel Ángel Ruiz', 'mruiz@tvalle.mx', '664-555-0505', 'Carr. Tecate Km 5, Tecate, BC', 30, 50000, 'inactive');

-- ── Vehículos ────────────────────────────────────────────────
insert into public.vehicles (unit_number, plate, brand, model, year, trailer_type, odometer, fuel_type, km_per_liter, status, last_maintenance_date)
values
  ('T-001', 'BC-123-AA', 'Kenworth', 'T680', 2021, 'Dry Van (Caja Seca)',    285000, 'Diesel', 3.2, 'available',  '2024-11-15'),
  ('T-002', 'BC-456-BB', 'Freightliner', 'Cascadia', 2020, 'Reefer (Refrigerado)', 312000, 'Diesel', 2.9, 'available',  '2024-10-20'),
  ('T-003', 'BC-789-CC', 'Peterbilt', '389', 2019, 'Flatbed (Plataforma)',   198000, 'Diesel', 3.0, 'maintenance', '2024-12-01'),
  ('T-004', 'BC-012-DD', 'International', 'LT625', 2022, 'Dry Van (Caja Seca)', 145000, 'Diesel', 3.5, 'available',  '2024-11-30'),
  ('T-005', 'BC-345-EE', 'Volvo', 'VNL 860', 2023, 'Reefer (Refrigerado)',   82000, 'Diesel', 3.8, 'available',  '2024-12-10');

-- ── Conductores ──────────────────────────────────────────────
insert into public.drivers (full_name, license_number, license_expiry, phone, emergency_contact, status, rating, total_trips)
values
  ('Juan Carlos Pérez', 'BC-001-2025', '2026-03-15', '664-555-1001', 'María Pérez 664-555-1011', 'available', 4.8, 145),
  ('Luis Fernando Ramos', 'BC-002-2024', '2025-08-20', '664-555-1002', 'Ana Ramos 664-555-1012',  'available', 4.6, 98),
  ('Alejandro Martínez', 'BC-003-2025', '2026-01-10', '664-555-1003', 'Pedro Martínez 664-555-1013', 'on_trip', 4.9, 210),
  ('Ricardo Vázquez', 'BC-004-2023', '2025-06-30', '664-555-1004', 'Sofía Vázquez 664-555-1014', 'rest', 4.3, 67),
  ('Ernesto Gutiérrez', 'BC-005-2024', '2025-11-25', '664-555-1005', 'Carmen Gutiérrez 664-555-1015', 'available', 4.7, 183);
