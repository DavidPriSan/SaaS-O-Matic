# Spec 04 · Modelo de datos (SQLite)

Driver: `better-sqlite3` (síncrono, transacciones simples, sin ORM). Al abrir la conexión:
`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;`

```
┌──────────────────────────┐         ┌────────────────────────────────┐
│ customers                │ 1     * │ simulations                    │
├──────────────────────────┤─────────├────────────────────────────────┤
│ id PK                    │         │ id PK                          │
│ company_name             │         │ customer_id FK → customers.id  │
│ tax_id   (normalizado)   │         │ active_users / storage_gb /    │
│ tax_id_type              │         │ api_calls                      │
│ email                    │         │ plan, country_code  (snapshot) │
│ country_code             │         │ pricing_version     (snapshot) │
│ plan                     │         │ tier_breakdown JSON (snapshot) │
│ created_at               │         │ *_cents, tax_rate_bp           │
└──────────────────────────┘         │ created_at                     │
                                     └────────────────────────────────┘
```

## DDL (`apps/api/src/db/migrations/001_init.sql`)

```sql
CREATE TABLE customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name  TEXT    NOT NULL CHECK (length(company_name) BETWEEN 2 AND 120),
  tax_id        TEXT    NOT NULL,
  tax_id_type   TEXT    NOT NULL CHECK (tax_id_type IN ('DNI','NIE','NIF_SPECIAL','CIF','GENERIC')),
  email         TEXT    NOT NULL,
  country_code  TEXT    NOT NULL CHECK (length(country_code) = 2),
  plan          TEXT    NOT NULL CHECK (plan IN ('basic','pro','enterprise')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (country_code, tax_id)
);
CREATE INDEX idx_customers_created ON customers (created_at DESC);

CREATE TABLE simulations (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id            INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  active_users           INTEGER NOT NULL CHECK (active_users >= 1),
  storage_gb             INTEGER NOT NULL CHECK (storage_gb >= 0),
  api_calls              INTEGER NOT NULL CHECK (api_calls >= 0),
  plan                   TEXT    NOT NULL,
  country_code           TEXT    NOT NULL,
  pricing_version        TEXT    NOT NULL,
  tier_breakdown         TEXT    NOT NULL CHECK (json_valid(tier_breakdown)),
  base_cents             INTEGER NOT NULL,
  storage_overage_gb     INTEGER NOT NULL,
  storage_overage_cents  INTEGER NOT NULL,
  api_overage_blocks     INTEGER NOT NULL,
  api_overage_cents      INTEGER NOT NULL,
  subtotal_cents         INTEGER NOT NULL,
  tax_rate_bp            INTEGER NOT NULL,
  tax_cents              INTEGER NOT NULL,
  total_cents            INTEGER NOT NULL CHECK (total_cents = subtotal_cents + tax_cents),
  created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_simulations_customer ON simulations (customer_id, created_at DESC);
```

## Decisiones
- **Snapshot en `simulations`** (plan, país, IVA, desglose, versión): el historial es inmutable aunque cambien el plan del cliente o la tarifa (A8).
- **Columnas de importe desnormalizadas** junto al JSON del desglose: permiten consultar y ordenar por total sin parsear JSON. El `CHECK` garantiza la coherencia.
- **`CHECK` en BD además de Zod**: defensa en profundidad. Si un bug salta la validación de la app, la BD lo rechaza.
- **Sin índice sobre `company_name`**: la búsqueda es un "contiene" (`LIKE '%x%'`), que nunca usa un índice B-tree. A esta escala un *full scan* es despreciable. Si creciera, la opción sería una tabla virtual FTS5.
- **Búsqueda sin distinguir mayúsculas ni tildes**: función SQL `search_normalize()` registrada desde Node (NFD + quitar diacríticos + minúsculas). El `LIKE` nativo de SQLite solo pasa a minúsculas los caracteres ASCII.
- **Migraciones**: ficheros `NNN_nombre.sql` aplicados en orden, con una tabla `schema_migrations(version)`. Se ejecutan al arrancar la API.
- **Ubicación**: `apps/api/data/saas-o-matic.db` (en `.gitignore`). Los tests usan `:memory:`.
- **Seed**: `npm run seed` inserta 5 clientes de ejemplo con NIF/CIF válidos y varias simulaciones.
