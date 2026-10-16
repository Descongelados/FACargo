# FACargo — Base de Datos Supabase

## Pasos para aplicar el schema

### 1. Crear proyecto en Supabase
1. Ve a [https://supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. Anota la **URL** y la **anon key** (en *Project Settings → API*).

### 2. Configurar variables de entorno
Copia `.env.example` como `.env` en la raíz del proyecto y llena los valores:

```env
VITE_APP_TITLE=FACargo
VITE_APP_STAGE=2

VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Ejecutar el schema
1. En el dashboard de Supabase ve a **SQL Editor → New query**.
2. Pega el contenido completo de [`supabase/schema.sql`](./schema.sql).
3. Haz clic en **Run** (▶).
> **Base ya existente:** si creaste las tablas con una versión anterior de `schema.sql`, ejecuta además
> [`migrations/001_quotes_formal_fields.sql`](./migrations/001_quotes_formal_fields.sql) para agregar los campos
> nuevos de cotizaciones (contacto, dirección, fecha de servicio y referencia).



### 4. Cargar datos de prueba (opcional)
1. En el mismo SQL Editor abre una nueva query.
2. Pega el contenido de [`supabase/seed.sql`](./seed.sql).
3. Haz clic en **Run** (▶).

### 5. Crear el primer usuario administrador
1. Ve a **Authentication → Users → Add user**.
2. Introduce email y contraseña.
3. El trigger `on_auth_user_created` creará el perfil automáticamente con rol `dispatcher`.
4. Para cambiar el rol a `admin`, ejecuta:

```sql
update public.profiles
set role = 'admin'
where id = '<uuid-del-usuario>';
```

---

## Estructura de tablas

| Tabla | Descripción |
|---|---|
| `profiles` | Extiende `auth.users`; guarda nombre, rol y teléfono |
| `clients` | Clientes con RFC, crédito y contacto |
| `drivers` | Conductores con licencia, estatus y calificación |
| `vehicles` | Unidades con tipo de remolque, odómetro y rendimiento |
| `trips` | Viajes con origen, destino, flete y estatus |
| `quotes` | Cotizaciones (pueden ser para clientes invitados) |
| `expenses` | Gastos por viaje: combustible, casetas, viáticos, etc. |
| `maintenances` | Mantenimientos por vehículo: preventivo, correctivo, etc. |
| `insurance_policies` | Pólizas de seguro por vehículo |
| `accounting_periods` | Períodos contables mensuales (open / closed) |
| `accounting_entries` | Entradas contables por período |

## Roles y permisos (RLS)

| Rol | Puede hacer |
|---|---|
| `admin` | Todo |
| `dispatcher` | Leer todo · Crear/editar clientes, viajes, cotizaciones, gastos, conductores |
| `operator` | Leer todo · Editar vehículos, mantenimientos, gastos |
| `finance` | Leer todo · Crear/editar contabilidad y seguros |
| `viewer` | Solo lectura |

## ENUMs disponibles

- `user_role`: `admin`, `dispatcher`, `operator`, `finance`, `viewer`
- `driver_status`: `available`, `on_trip`, `rest`, `inactive`
- `vehicle_status`: `available`, `in_transit`, `maintenance`, `out_of_service`
- `trailer_type`: `Dry Van (Caja Seca)`, `Reefer (Refrigerado)`, `Flatbed (Plataforma)`, `Tanker (Pipa)`, `Lowboy`
- `trip_status`: `pending`, `assigned`, `loading`, `in_transit`, `delivered`, `cancelled`
- `quote_status`: `draft`, `sent`, `approved`, `rejected`
- `expense_category`: `fuel`, `toll`, `viatics`, `maintenance`, `fine`, `other`
- `maintenance_type`: `preventive`, `corrective`, `tire`, `inspection`
- `maintenance_status`: `scheduled`, `in_progress`, `completed`
- `insurance_coverage`: `rc`, `damage`, `theft`, `cargo`, `medical`, `full`
- `accounting_entry_type`: `income`, `expense`, `adjustment`
- `period_status`: `open`, `closed`
