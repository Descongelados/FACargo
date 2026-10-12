import { Role } from '../types';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  dispatcher: 'Despachador',
  operator: 'Operador',
  finance: 'Finanzas',
  viewer: 'Solo Lectura',
};
