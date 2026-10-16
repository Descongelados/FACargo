import { Client, Driver, Vehicle, Trip, Expense, Maintenance, User } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'usr-1', name: 'Rodrigo Morales', email: 'rodrigo@facargo.com', role: 'admin', status: 'active' },
  { id: 'usr-2', name: 'Carla Valencia', email: 'carla@facargo.com', role: 'dispatcher', status: 'active' },
  { id: 'usr-3', name: 'Miguel Castillo', email: 'miguel@facargo.com', role: 'finance', status: 'active' },
  { id: 'usr-4', name: 'Javier Luna', email: 'javier@facargo.com', role: 'operator', status: 'active' },
];

export const MOCK_CLIENTS: Client[] = [];

export const MOCK_DRIVERS: Driver[] = [];

export const MOCK_VEHICLES: Vehicle[] = [];

export const MOCK_TRIPS: Trip[] = [];

export const MOCK_EXPENSES: Expense[] = [];

export const MOCK_MAINTENANCE: Maintenance[] = [];
