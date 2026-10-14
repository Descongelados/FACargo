import { useNotifyStore } from '../store/useNotifyStore';

/**
 * Valida campos obligatorios. Recibe { 'Etiqueta visible': valor }.
 * Si falta alguno, avisa en pantalla y devuelve false.
 */
export function requireFields(fields: Record<string, unknown>): boolean {
  const missing = Object.entries(fields)
    .filter(([, v]) => v === undefined || v === null || (typeof v === 'string' && v.trim() === ''))
    .map(([label]) => label);
  if (missing.length === 0) return true;
  useNotifyStore.getState().notifyError(`Completa los campos obligatorios: ${missing.join(', ')}.`);
  return false;
}
