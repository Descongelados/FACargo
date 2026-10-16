# Arquitectura de FACargo

## 1. Patrón de Diseño
- **Frontend SPA**: React 18 con Vite y TypeScript estricto.
- **Gestión de Estado**: Zustand con stores atómicos por entidad (`useTripsStore`, `useVehiclesStore`, `useDriversStore`, `useExpensesStore`, `useClientsStore`, `useAuthStore`).
- **Seguridad y RBAC**: Control de acceso basado en roles definido en `src/rbac.ts`.

## 2. Flujo de Datos
1. La capa de presentación (`src/pages/*`) consume directamente los stores de Zustand.
2. Los stores manejan operaciones CRUD sincronizadas con persistencia local (`localStorage`).
3. En la Etapa 2, los stores cambiarán a llamar a clientes de servicio (`src/services/supabaseClient.ts`) sin alterar la interfaz de los componentes.