/**
 * Mappers: filas DB (snake_case) ↔ tipos TypeScript (camelCase)
 * Cada dominio tiene un fromDB y un toDB.
 */

import type {
  User, Client, Driver, Vehicle, Trip, Quote,
  Expense, Maintenance, InsurancePolicy,
  AccountingPeriod, AccountingEntry,
} from '../types';

// ─── PROFILES / USERS ────────────────────────────────────────────────────────

export function profileFromDB(row: Record<string, unknown>): User {
  return {
    id:        row.id as string,
    name:      row.full_name as string,
    email:     (row.email as string) ?? '',
    role:      row.role as User['role'],
    avatar:    row.avatar_url as string | undefined,
    status:    row.status as User['status'],
  };
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export function clientFromDB(row: Record<string, unknown>): Client {
  return {
    id:           row.id as string,
    name:         row.name as string,
    taxId:        row.tax_id as string,
    contactName:  (row.contact_name as string) ?? '',
    email:        (row.email as string) ?? '',
    phone:        (row.phone as string) ?? '',
    address:      (row.address as string) ?? '',
    creditDays:   row.credit_days as number,
    creditLimit:  row.credit_limit as number,
    status:       row.status as Client['status'],
  };
}

export function clientToDB(c: Omit<Client, 'id'>) {
  return {
    name:         c.name,
    tax_id:       c.taxId,
    contact_name: c.contactName,
    email:        c.email,
    phone:        c.phone,
    address:      c.address,
    credit_days:  c.creditDays,
    credit_limit: c.creditLimit,
    status:       c.status,
  };
}

// ─── DRIVERS ─────────────────────────────────────────────────────────────────

export function driverFromDB(row: Record<string, unknown>): Driver {
  return {
    id:                 row.id as string,
    fullName:           row.full_name as string,
    licenseNumber:      row.license_number as string,
    licenseExpiry:      row.license_expiry as string,
    phone:              row.phone as string,
    emergencyContact:   (row.emergency_contact as string) ?? '',
    status:             row.status as Driver['status'],
    assignedVehicleId:  row.assigned_vehicle_id as string | undefined,
    rating:             row.rating as number,
    totalTrips:         row.total_trips as number,
  };
}

export function driverToDB(d: Omit<Driver, 'id'>) {
  return {
    full_name:            d.fullName,
    license_number:       d.licenseNumber,
    license_expiry:       d.licenseExpiry,
    phone:                d.phone,
    emergency_contact:    d.emergencyContact,
    status:               d.status,
    assigned_vehicle_id:  d.assignedVehicleId ?? null,
    rating:               d.rating,
    total_trips:          d.totalTrips,
  };
}

// ─── VEHICLES ────────────────────────────────────────────────────────────────

export function vehicleFromDB(row: Record<string, unknown>): Vehicle {
  return {
    id:                   row.id as string,
    unitNumber:           row.unit_number as string,
    plate:                row.plate as string,
    brand:                row.brand as string,
    model:                row.model as string,
    year:                 row.year as number,
    trailerType:          row.trailer_type as Vehicle['trailerType'],
    odometer:             row.odometer as number,
    fuelType:             row.fuel_type as Vehicle['fuelType'],
    kmPerLiter:           row.km_per_liter as number | undefined,
    status:               row.status as Vehicle['status'],
    lastMaintenanceDate:  (row.last_maintenance_date as string) ?? '',
  };
}

export function vehicleToDB(v: Omit<Vehicle, 'id'>) {
  return {
    unit_number:            v.unitNumber,
    plate:                  v.plate,
    brand:                  v.brand,
    model:                  v.model,
    year:                   v.year,
    trailer_type:           v.trailerType,
    odometer:               v.odometer,
    fuel_type:              v.fuelType,
    km_per_liter:           v.kmPerLiter ?? null,
    status:                 v.status,
    last_maintenance_date:  v.lastMaintenanceDate || null,
  };
}

// ─── TRIPS ───────────────────────────────────────────────────────────────────

export function tripFromDB(row: Record<string, unknown>): Trip {
  return {
    id:               row.id as string,
    tripNumber:       row.trip_number as string,
    clientId:         row.client_id as string,
    clientName:       (row as Record<string, unknown> & { clients?: { name: string } }).clients?.name ?? '',
    driverId:         row.driver_id as string,
    driverName:       (row as Record<string, unknown> & { drivers?: { full_name: string } }).drivers?.full_name ?? '',
    vehicleId:        row.vehicle_id as string,
    vehicleUnit:      (row as Record<string, unknown> & { vehicles?: { unit_number: string } }).vehicles?.unit_number ?? '',
    origin:           row.origin as string,
    destination:      row.destination as string,
    cargoDescription: row.cargo_description as string,
    cargoWeightKg:    row.cargo_weight_kg as number,
    departureDate:    (row.departure_date as string) ?? '',
    deliveryDate:     (row.delivery_date as string) ?? '',
    rate:             row.rate as number,
    distanceKm:       row.distance_km as number,
    status:           row.status as Trip['status'],
    notes:            row.notes as string | undefined,
  };
}

export function tripToDB(t: Omit<Trip, 'id' | 'tripNumber' | 'clientName' | 'driverName' | 'vehicleUnit'>) {
  return {
    client_id:         t.clientId,
    driver_id:         t.driverId || null,
    vehicle_id:        t.vehicleId || null,
    origin:            t.origin,
    destination:       t.destination,
    cargo_description: t.cargoDescription,
    cargo_weight_kg:   t.cargoWeightKg,
    departure_date:    t.departureDate || null,
    delivery_date:     t.deliveryDate || null,
    rate:              t.rate,
    distance_km:       t.distanceKm,
    status:            t.status,
    notes:             t.notes ?? null,
  };
}

// ─── QUOTES ──────────────────────────────────────────────────────────────────

export function quoteFromDB(row: Record<string, unknown>): Quote {
  return {
    id:                 row.id as string,
    quoteNumber:        row.quote_number as string,
    clientId:           row.client_id as string,
    clientName:         (row as Record<string, unknown> & { clients?: { name: string } }).clients?.name ?? '',
    guestClientPhone:   row.guest_client_phone as string | undefined,
    guestClientEmail:   row.guest_client_email as string | undefined,
    vehicleId:          row.vehicle_id as string | undefined,
    vehicleUnit:        (row as Record<string, unknown> & { vehicles?: { unit_number: string } }).vehicles?.unit_number,
    origin:             row.origin as string,
    destination:        row.destination as string,
    cargoDescription:   row.cargo_description as string,
    cargoWeightKg:      row.cargo_weight_kg as number,
    distanceKm:         row.distance_km as number,
    trailerType:        row.trailer_type as Quote['trailerType'],
    proposedRate:       row.proposed_rate as number,
    validUntil:         row.valid_until as string,
    status:             row.status as Quote['status'],
    notes:              row.notes as string | undefined,
    createdAt:          row.created_at as string,
  };
}

export function quoteToDB(q: Omit<Quote, 'id' | 'quoteNumber' | 'clientName' | 'vehicleUnit' | 'createdAt'>) {
  return {
    client_id:           q.clientId || null,
    guest_client_phone:  q.guestClientPhone ?? null,
    guest_client_email:  q.guestClientEmail ?? null,
    vehicle_id:          q.vehicleId ?? null,
    origin:              q.origin,
    destination:         q.destination,
    cargo_description:   q.cargoDescription,
    cargo_weight_kg:     q.cargoWeightKg,
    distance_km:         q.distanceKm,
    trailer_type:        q.trailerType,
    proposed_rate:       q.proposedRate,
    valid_until:         q.validUntil,
    status:              q.status,
    notes:               q.notes ?? null,
  };
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export function expenseFromDB(row: Record<string, unknown>): Expense {
  return {
    id:             row.id as string,
    tripId:         row.trip_id as string | undefined,
    tripNumber:     (row as Record<string, unknown> & { trips?: { trip_number: string } }).trips?.trip_number,
    category:       row.category as Expense['category'],
    description:    row.description as string,
    amount:         row.amount as number,
    date:           row.date as string,
    vendor:         row.vendor as string | undefined,
    invoiceNumber:  row.invoice_number as string | undefined,
  };
}

export function expenseToDB(e: Omit<Expense, 'id' | 'tripNumber'>) {
  return {
    trip_id:        e.tripId ?? null,
    category:       e.category,
    description:    e.description,
    amount:         e.amount,
    date:           e.date,
    vendor:         e.vendor ?? null,
    invoice_number: e.invoiceNumber ?? null,
  };
}

// ─── MAINTENANCES ────────────────────────────────────────────────────────────

export function maintenanceFromDB(row: Record<string, unknown>): Maintenance {
  return {
    id:                     row.id as string,
    vehicleId:              row.vehicle_id as string,
    vehicleUnit:            (row as Record<string, unknown> & { vehicles?: { unit_number: string } }).vehicles?.unit_number ?? '',
    type:                   row.type as Maintenance['type'],
    description:            row.description as string,
    workshop:               (row.workshop as string) ?? '',
    cost:                   row.cost as number,
    date:                   row.date as string,
    status:                 row.status as Maintenance['status'],
    nextScheduledOdometer:  row.next_scheduled_odometer as number | undefined,
  };
}

export function maintenanceToDB(m: Omit<Maintenance, 'id' | 'vehicleUnit'>) {
  return {
    vehicle_id:               m.vehicleId,
    type:                     m.type,
    description:              m.description,
    workshop:                 m.workshop,
    cost:                     m.cost,
    date:                     m.date,
    status:                   m.status,
    next_scheduled_odometer:  m.nextScheduledOdometer ?? null,
  };
}

// ─── INSURANCE POLICIES ──────────────────────────────────────────────────────

export function insuranceFromDB(row: Record<string, unknown>): InsurancePolicy {
  return {
    id:              row.id as string,
    vehicleId:       row.vehicle_id as string,
    vehicleUnit:     (row as Record<string, unknown> & { vehicles?: { unit_number: string } }).vehicles?.unit_number ?? '',
    policyNumber:    row.policy_number as string,
    insurer:         row.insurer as string,
    coverage:        row.coverage as InsurancePolicy['coverage'],
    annualPremium:   row.annual_premium as number,
    monthlyPayment:  row.monthly_payment as number | undefined,
    startDate:       row.start_date as string,
    endDate:         row.end_date as string,
    contactName:     row.contact_name as string | undefined,
    contactPhone:    row.contact_phone as string | undefined,
    notes:           row.notes as string | undefined,
  };
}

export function insuranceToDB(p: Omit<InsurancePolicy, 'id' | 'vehicleUnit'>) {
  return {
    vehicle_id:      p.vehicleId,
    policy_number:   p.policyNumber,
    insurer:         p.insurer,
    coverage:        p.coverage,
    annual_premium:  p.annualPremium,
    monthly_payment: p.monthlyPayment ?? null,
    start_date:      p.startDate,
    end_date:        p.endDate,
    contact_name:    p.contactName ?? null,
    contact_phone:   p.contactPhone ?? null,
    notes:           p.notes ?? null,
  };
}

// ─── ACCOUNTING PERIODS ──────────────────────────────────────────────────────

export function periodFromDB(row: Record<string, unknown>): AccountingPeriod {
  return {
    id:              row.id as string,
    year:            row.year as number,
    month:           row.month as number,
    status:          row.status as AccountingPeriod['status'],
    openingBalance:  row.opening_balance as number,
    closedAt:        row.closed_at as string | undefined,
    closedBy:        row.closed_by as string | undefined,
    notes:           row.notes as string | undefined,
  };
}

export function periodToDB(p: Omit<AccountingPeriod, 'id'>) {
  return {
    year:             p.year,
    month:            p.month,
    status:           p.status,
    opening_balance:  p.openingBalance,
    closed_at:        p.closedAt ?? null,
    closed_by:        p.closedBy ?? null,
    notes:            p.notes ?? null,
  };
}

// ─── ACCOUNTING ENTRIES ──────────────────────────────────────────────────────

export function entryFromDB(row: Record<string, unknown>): AccountingEntry {
  return {
    id:              row.id as string,
    periodId:        row.period_id as string,
    type:            row.type as AccountingEntry['type'],
    category:        row.category as AccountingEntry['category'],
    description:     row.description as string,
    amount:          row.amount as number,
    date:            row.date as string,
    reference:       row.reference as string | undefined,
    notes:           row.notes as string | undefined,
    isAutoGenerated: row.is_auto_generated as boolean,
  };
}

export function entryToDB(e: Omit<AccountingEntry, 'id'>) {
  return {
    period_id:         e.periodId,
    type:              e.type,
    category:          e.category,
    description:       e.description,
    amount:            e.amount,
    date:              e.date,
    reference:         e.reference ?? null,
    notes:             e.notes ?? null,
    is_auto_generated: e.isAutoGenerated,
  };
}
