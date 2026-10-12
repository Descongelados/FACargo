import { Client, Driver, Vehicle, Trip, Expense, Maintenance, User } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'usr-1', name: 'Rodrigo Morales', email: 'rodrigo@freightflow.com', role: 'admin', status: 'active' },
  { id: 'usr-2', name: 'Carla Valencia', email: 'carla@freightflow.com', role: 'dispatcher', status: 'active' },
  { id: 'usr-3', name: 'Miguel Castillo', email: 'miguel@freightflow.com', role: 'finance', status: 'active' },
  { id: 'usr-4', name: 'Javier Luna', email: 'javier@freightflow.com', role: 'operator', status: 'active' },
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'cli-1', name: 'Distribuidora del Norte S.A.', taxId: 'DNO920101AB1', contactName: 'Ing. Fernando Rios', email: 'frios@distnorte.com', phone: '+52 81 8320 4000', address: 'Av. Industrial 402, Monterrey, NL', creditDays: 30, creditLimit: 250000, status: 'active' },
  { id: 'cli-2', name: 'Logística y Alimentos del Bajío', taxId: 'LAB180422XY8', contactName: 'Lic. Laura Méndez', email: 'lmendez@alimentosbajio.com', phone: '+52 477 718 9012', address: 'Parque Logístico Nave 12, León, GTO', creditDays: 15, creditLimit: 180000, status: 'active' },
  { id: 'cli-3', name: 'Aceros & Materiales de Occidente', taxId: 'AMO110905JK2', contactName: 'Carlos Vega', email: 'cvega@acerosoccidente.com', phone: '+52 33 3612 8844', address: 'Calzada González Gallo 120, Guadalajara, JAL', creditDays: 45, creditLimit: 500000, status: 'active' },
  { id: 'cli-4', name: 'Comercializadora Pacífico Sur', taxId: 'CPS140212NM9', contactName: 'Patricia Solís', email: 'patricia@comercialpacifico.com', phone: '+52 744 480 1122', address: 'Costera Miguel Alemán 90, Acapulco, GRO', creditDays: 30, creditLimit: 120000, status: 'active' },
];

export const MOCK_DRIVERS: Driver[] = [
  { id: 'drv-1', fullName: 'Arturo González Ramos', licenseNumber: 'FED-992019A', licenseExpiry: '2026-11-15', phone: '+52 81 1234 5678', emergencyContact: '+52 81 8765 4321', status: 'on_trip', assignedVehicleId: 'veh-1', rating: 4.9, totalTrips: 142 },
  { id: 'drv-2', fullName: 'Javier Luna Mendoza', licenseNumber: 'FED-847291B', licenseExpiry: '2025-08-20', phone: '+52 33 2233 4455', emergencyContact: '+52 33 9988 7766', status: 'available', assignedVehicleId: 'veh-2', rating: 4.8, totalTrips: 98 },
  { id: 'drv-3', fullName: 'Ernesto Beltrán Silva', licenseNumber: 'FED-301928A', licenseExpiry: '2024-12-01', phone: '+52 55 4433 2211', emergencyContact: '+52 55 1122 3344', status: 'available', rating: 4.7, totalTrips: 76 },
  { id: 'drv-4', fullName: 'Manuel Ortiz Flores', licenseNumber: 'FED-118822C', licenseExpiry: '2026-04-10', phone: '+52 477 990 1122', emergencyContact: '+52 477 334 5566', status: 'rest', assignedVehicleId: 'veh-3', rating: 4.95, totalTrips: 210 },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'veh-1', unitNumber: 'TR-101', plate: '74-AB-9E', brand: 'Kenworth', model: 'T680', year: 2022, trailerType: 'Dry Van (Caja Seca)', odometer: 184500, fuelType: 'Diesel', status: 'in_transit', lastMaintenanceDate: '2024-02-10' },
  { id: 'veh-2', unitNumber: 'TR-102', plate: '82-BC-4T', brand: 'Freightliner', model: 'Cascadia', year: 2023, trailerType: 'Reefer (Refrigerado)', odometer: 92300, fuelType: 'Diesel', status: 'available', lastMaintenanceDate: '2024-03-01' },
  { id: 'veh-3', unitNumber: 'TR-103', plate: '19-XZ-1P', brand: 'International', model: 'LT Series', year: 2021, trailerType: 'Flatbed (Plataforma)', odometer: 245000, fuelType: 'Diesel', status: 'available', lastMaintenanceDate: '2024-01-18' },
  { id: 'veh-4', unitNumber: 'TR-104', plate: '33-TR-8M', brand: 'Volvo', model: 'VNL 860', year: 2020, trailerType: 'Tanker (Pipa)', odometer: 310200, fuelType: 'Diesel', status: 'maintenance', lastMaintenanceDate: '2024-03-12' },
];

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trp-1',
    tripNumber: 'FF-2024-001',
    clientId: 'cli-1',
    clientName: 'Distribuidora del Norte S.A.',
    driverId: 'drv-1',
    driverName: 'Arturo González Ramos',
    vehicleId: 'veh-1',
    vehicleUnit: 'TR-101',
    origin: 'Monterrey, NL',
    destination: 'Ciudad de México, CDMX',
    cargoDescription: '24 Tarimas de Alimentos no perecederos',
    cargoWeightKg: 18500,
    departureDate: '2024-03-14 06:00',
    deliveryDate: '2024-03-15 14:00',
    rate: 42000,
    status: 'in_transit',
    distanceKm: 920,
    notes: 'Entrega prioritaria en CEDIS Cuautitlán'
  },
  {
    id: 'trp-2',
    tripNumber: 'FF-2024-002',
    clientId: 'cli-2',
    clientName: 'Logística y Alimentos del Bajío',
    driverId: 'drv-2',
    driverName: 'Javier Luna Mendoza',
    vehicleId: 'veh-2',
    vehicleUnit: 'TR-102',
    origin: 'León, GTO',
    destination: 'Guadalajara, JAL',
    cargoDescription: 'Cajas de Calzado y Artículos de Piel',
    cargoWeightKg: 12000,
    departureDate: '2024-03-16 08:00',
    deliveryDate: '2024-03-16 16:00',
    rate: 18500,
    status: 'assigned',
    distanceKm: 220,
  },
  {
    id: 'trp-3',
    tripNumber: 'FF-2024-003',
    clientId: 'cli-3',
    clientName: 'Aceros & Materiales de Occidente',
    driverId: 'drv-4',
    driverName: 'Manuel Ortiz Flores',
    vehicleId: 'veh-3',
    vehicleUnit: 'TR-103',
    origin: 'Guadalajara, JAL',
    destination: 'Manzanillo, COL',
    cargoDescription: 'Vigas y Perfiles de Acero Estructural',
    cargoWeightKg: 24000,
    departureDate: '2024-03-10 07:00',
    deliveryDate: '2024-03-11 11:30',
    rate: 29000,
    status: 'delivered',
    distanceKm: 310,
    notes: 'Recibido de conformidad con firma de almacén'
  }
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'exp-1', tripId: 'trp-1', tripNumber: 'FF-2024-001', category: 'fuel', description: 'Recarga Diesel 450L Estación San Luis', amount: 11250, date: '2024-03-14', vendor: 'Gasolineras OXXO Gas' },
  { id: 'exp-2', tripId: 'trp-1', tripNumber: 'FF-2024-001', category: 'toll', description: 'Peajes Autopista Saltillo - Matehuala', amount: 3400, date: '2024-03-14', vendor: 'CAPUFE' },
  { id: 'exp-3', tripId: 'trp-1', tripNumber: 'FF-2024-001', category: 'viatics', description: 'Viáticos y Alimentos Operador', amount: 1800, date: '2024-03-14' },
  { id: 'exp-4', tripId: 'trp-3', tripNumber: 'FF-2024-003', category: 'fuel', description: 'Recarga Diesel 280L Manzanillo', amount: 6900, date: '2024-03-10', vendor: 'Petro Seven' },
];

export const MOCK_MAINTENANCE: Maintenance[] = [
  { id: 'mnt-1', vehicleId: 'veh-4', vehicleUnit: 'TR-104', type: 'preventive', description: 'Cambio de aceite motor, filtros de combustible y aire', workshop: 'Taller Central FreightFlow', cost: 14500, date: '2024-03-12', status: 'in_progress', nextScheduledOdometer: 340000 },
  { id: 'mnt-2', vehicleId: 'veh-1', vehicleUnit: 'TR-101', type: 'tire', description: 'Calibración y cambio de 2 llantas de tracción', workshop: 'Llantas y Servicios del Norte', cost: 18200, date: '2024-02-10', status: 'completed' },
];