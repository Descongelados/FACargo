import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_NAME } from '../constants';

// ─── Tipo de configuración de cotización ──────────────────────────────────────
export interface QuoteFeature {
  title: string;
  sub: string;
}

export interface QuoteConfig {
  // Encabezado
  companyName: string;
  slogan: string;
  // Colores (hex)
  primaryColor: string;   // morado encabezado/secciones
  accentColor: string;    // naranja acento/total
  // Contacto en footer
  phone: string;
  email: string;
  website: string;
  // Texto del footer derecho
  footerTagline: string;
  // Sub-footer central
  footerSubline: string;
  // Características (franja central)
  features: QuoteFeature[];
  // Condiciones comerciales (lista de strings)
  conditions: string[];
  // Datos fiscales del emisor (encabezado y datos bancarios del PDF)
  legalName: string;      // razón social / titular de la cuenta
  rfc: string;
  address: string;        // dirección de la empresa (pie del PDF)
  // WhatsApp para el QR del PDF (si está vacío se usa el teléfono)
  whatsapp: string;
  // Datos bancarios para el pago por transferencia
  bankName: string;
  bankAccount: string;
  bankClabe: string;
  // Firma
  signerName: string;
  signerTitle: string;
  // IVA %
  ivaPercent: number;
  // % casetas sobre flete base
  tollPercent: number;
  // % maniobras sobre flete base
  maneuverPercent: number;
}

export const DEFAULT_QUOTE_CONFIG: QuoteConfig = {
  companyName: APP_NAME,
  slogan: 'LOGÍSTICA QUE TE LLEVA MÁS LEJOS',
  primaryColor: '#342B63',
  accentColor: '#EA580C',
  phone: '+52 33 1234 5678',
  email: 'contacto@facargo.com',
  website: 'www.facargo.com',
  footerTagline: 'TU ALIADO EN EL CAMINO',
  footerSubline: 'FLETES LOCALES Y FORÁNEOS  |  CARGA SEGURA  |  SOLUCIONES LOGÍSTICAS',
  legalName: '',
  rfc: '',
  address: '',
  whatsapp: '',
  bankName: '',
  bankAccount: '',
  bankClabe: '',
  signerName: '',
  signerTitle: '',
  features: [
    { title: 'Seguro de mercancía',   sub: 'Tu carga protegida' },
    { title: 'Rastreo GPS',           sub: 'Monitoreo en tiempo real' },
    { title: 'Cobertura nacional',    sub: 'Llegamos a donde nos necesites' },
    { title: 'Operador certificado',  sub: 'Experiencia y seguridad' },
  ],
  conditions: [
    'El precio incluye operador y combustible.',
    'La cotización considera carga y descarga en planta.',
    'No incluye almacenaje ni servicios extraordinarios.',
    'Tiempo estimado de tránsito: {transito}.',
    'Forma de pago: Transferencia bancaria.',
    'Crédito sujeto a autorización.',
    'Esta cotización tiene una vigencia de {vigencia}.',
    'Cualquier cambio en la ruta, peso o condiciones de carga puede generar una variación en el costo.',
  ],
  ivaPercent: 16,
  tollPercent: 8,
  maneuverPercent: 6,
};

// ─── Store ─────────────────────────────────────────────────────────────────────
interface SettingsState {
  systemName: string;
  logoUrl: string | null;
  quoteConfig: QuoteConfig;
  setSystemName: (name: string) => void;
  setLogoUrl: (url: string | null) => void;
  setQuoteConfig: (cfg: Partial<QuoteConfig>) => void;
  resetQuoteConfig: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      systemName: APP_NAME,
      logoUrl: null,
      quoteConfig: DEFAULT_QUOTE_CONFIG,
      setSystemName: (name) => set({ systemName: name.trim() || APP_NAME }),
      setLogoUrl: (url) => set({ logoUrl: url }),
      setQuoteConfig: (cfg) =>
        set((s) => ({ quoteConfig: { ...s.quoteConfig, ...cfg } })),
      resetQuoteConfig: () => set({ quoteConfig: DEFAULT_QUOTE_CONFIG }),
    }),
    {
      name: 'facargo-settings',
      version: 1,
      // v0 → v1: textos de condiciones que ahora usan datos reales de cada cotización
      migrate: (persisted) => {
        const s = persisted as { quoteConfig?: QuoteConfig };
        if (s.quoteConfig?.conditions) {
          s.quoteConfig.conditions = s.quoteConfig.conditions.map((c) => LEGACY_CONDITIONS[c] ?? c);
        }
        return s as SettingsState;
      },
      // Completa con valores por defecto los campos nuevos que no existan en lo ya guardado
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return { ...current, ...p, quoteConfig: { ...current.quoteConfig, ...p.quoteConfig } };
      },
    }
  )
);

const LEGACY_CONDITIONS: Record<string, string> = {
  'Tiempo estimado de tránsito según la distancia del servicio.': 'Tiempo estimado de tránsito: {transito}.',
  'Vigencia indicada en la cotización.': 'Esta cotización tiene una vigencia de {vigencia}.',
  'Cualquier cambio en la ruta o peso puede generar variación en el costo.':
    'Cualquier cambio en la ruta, peso o condiciones de carga puede generar una variación en el costo.',
};

// Helper: convierte hex "#RRGGBB" → [R, G, B]
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}
