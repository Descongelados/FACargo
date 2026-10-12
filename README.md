# 🚛 FreightFlow TMS

**Transportation Management System (TMS)** para administración integral de transporte de carga, logística, flotillas y fletes.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)
![Zustand](https://img.shields.io/badge/State-Zustand-orange)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Arquitectura y Etapas

### Etapa 1 (Implementada)
- ✅ Estado global reactivo con **Zustand**
- ✅ Persistencia local / en memoria con catálogo de datos mock enriquecido
- ✅ Módulos completos con interfaz moderna Dark/Light UI:
  - 📊 **Dashboard Ejecutivo**: KPIs, gráficas financieras y estado de viajes en tiempo real
  - 👥 **Clientes**: Directorio, crédito, contratos y estatus
  - 👨‍✈️ **Operadores**: Licencias, contacto, unidad asignada y métricas
  - 🚚 **Unidades (Flotilla)**: Placas, tipo de remolque, odómetro y estado
  - 🗺️ **Viajes & Despacho**: Origen, destino, carga, operador, unidad y flujo de estados
  - ⛽ **Gastos Operativos**: Combustible, casetas, viáticos, mantenimientos por viaje
  - 🛠️ **Mantenimientos**: Preventivo/Correctivo de unidades
  - 📈 **Reportes & Analytics**: Rentabilidad por viaje y operador
  - 🔐 **Usuarios & RBAC**: Roles (Administrador, Despachador, Operador, Finanzas)
  - ⚙️ **Configuración**: Parámetros del sistema y preparación para Supabase

### Etapas Futuras (Roadmap)
- **V2**: Integración Supabase (Auth, Postgres, Realtime)
- **V3**: Evidencias fotográficas, generación de PDF y Carta Porte / CFDI
- **V4**: Monitoreo GPS y geocercas
- **V5**: App Móvil conductores y notificaciones push

---

## 🛠️ Instalación y Ejecución

```bash
# 1. Clonar repositorio
git clone https://github.com/Descongelados/FreightFlowTMS.git
cd FreightFlowTMS

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```
