import { Role } from './types';

export interface Permission {
  viewDashboard: boolean;
  manageTrips: boolean;
  manageClients: boolean;
  manageDrivers: boolean;
  manageVehicles: boolean;
  manageExpenses: boolean;
  manageMaintenance: boolean;
  viewReports: boolean;
  manageUsers: boolean;
  manageSettings: boolean;
  viewAccounting: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  admin: {
    viewDashboard: true,
    manageTrips: true,
    manageClients: true,
    manageDrivers: true,
    manageVehicles: true,
    manageExpenses: true,
    manageMaintenance: true,
    viewReports: true,
    manageUsers: true,
    manageSettings: true,
    viewAccounting: true,
  },
  dispatcher: {
    viewDashboard: true,
    manageTrips: true,
    manageClients: true,
    manageDrivers: true,
    manageVehicles: true,
    manageExpenses: false,
    manageMaintenance: false,
    viewReports: false,
    manageUsers: false,
    manageSettings: false,
    viewAccounting: false,
  },
  operator: {
    viewDashboard: true,
    manageTrips: false,
    manageClients: false,
    manageDrivers: false,
    manageVehicles: false,
    manageExpenses: true,
    manageMaintenance: false,
    viewReports: false,
    manageUsers: false,
    manageSettings: false,
    viewAccounting: false,
  },
  finance: {
    viewDashboard: true,
    manageTrips: false,
    manageClients: true,
    manageDrivers: false,
    manageVehicles: false,
    manageExpenses: true,
    manageMaintenance: true,
    viewReports: true,
    manageUsers: false,
    manageSettings: false,
    viewAccounting: true,
  },
  viewer: {
    viewDashboard: true,
    manageTrips: false,
    manageClients: false,
    manageDrivers: false,
    manageVehicles: false,
    manageExpenses: false,
    manageMaintenance: false,
    viewReports: true,
    manageUsers: false,
    manageSettings: false,
    viewAccounting: false,
  },
};

export const hasPermission = (role: Role, action: keyof Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.[action] ?? false;
};
