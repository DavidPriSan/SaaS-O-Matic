CREATE TABLE customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name  TEXT    NOT NULL CHECK (length(company_name) BETWEEN 2 AND 120),
  tax_id        TEXT    NOT NULL,
  tax_id_type   TEXT    NOT NULL CHECK (tax_id_type IN ('DNI', 'NIE', 'NIF_SPECIAL', 'CIF', 'GENERIC')),
  email         TEXT    NOT NULL,
  country_code  TEXT    NOT NULL CHECK (length(country_code) = 2),
  plan          TEXT    NOT NULL CHECK (plan IN ('basic', 'pro', 'enterprise')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (country_code, tax_id)
);

CREATE INDEX idx_customers_created ON customers (created_at DESC);

CREATE TABLE simulations (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id            INTEGER NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
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
  created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_simulations_customer ON simulations (customer_id, created_at DESC);
