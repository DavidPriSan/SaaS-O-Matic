-- Defense in depth for simulations (external review): 001 left plan, country and the input maxima
-- unrestricted. SQLite cannot add CHECKs to an existing table, so it is rebuilt (official 12-step
-- procedure, simplified: no table references simulations, so foreign keys need not be disabled).
-- Values mirror packages/shared (PLAN_IDS, COUNTRY_CODES, QUOTE_LIMITS); migrations.test.ts fails
-- if the catalog changes without a new migration.

CREATE TABLE simulations_new (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id            INTEGER NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  active_users           INTEGER NOT NULL CHECK (active_users BETWEEN 1 AND 100000),
  storage_gb             INTEGER NOT NULL CHECK (storage_gb BETWEEN 0 AND 1000000),
  api_calls              INTEGER NOT NULL CHECK (api_calls BETWEEN 0 AND 10000000000),
  plan                   TEXT    NOT NULL CHECK (plan IN ('basic', 'pro', 'enterprise')),
  country_code           TEXT    NOT NULL CHECK (country_code IN ('ES', 'PT', 'FR', 'DE', 'IT', 'NL', 'IE', 'GB', 'US', 'MX')),
  pricing_version        TEXT    NOT NULL,
  tier_breakdown         TEXT    NOT NULL CHECK (json_valid(tier_breakdown)),
  base_cents             INTEGER NOT NULL CHECK (base_cents >= 0),
  storage_overage_gb     INTEGER NOT NULL CHECK (storage_overage_gb >= 0),
  storage_overage_cents  INTEGER NOT NULL CHECK (storage_overage_cents >= 0),
  api_overage_blocks     INTEGER NOT NULL CHECK (api_overage_blocks >= 0),
  api_overage_cents      INTEGER NOT NULL CHECK (api_overage_cents >= 0),
  subtotal_cents         INTEGER NOT NULL CHECK (subtotal_cents = base_cents + storage_overage_cents + api_overage_cents),
  tax_rate_bp            INTEGER NOT NULL CHECK (tax_rate_bp BETWEEN 0 AND 10000),
  tax_cents              INTEGER NOT NULL CHECK (tax_cents >= 0),
  total_cents            INTEGER NOT NULL CHECK (total_cents = subtotal_cents + tax_cents),
  created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Existing rows must satisfy the new rules: if one does not, the INSERT fails, the migration rolls back
-- and the API refuses to start (loud failure instead of silently dropping data).
INSERT INTO simulations_new SELECT * FROM simulations;

-- Keep the AUTOINCREMENT high-water mark: ids of deleted simulations are never reused.
DELETE FROM sqlite_sequence WHERE name = 'simulations_new';
INSERT INTO sqlite_sequence (name, seq) SELECT 'simulations_new', seq FROM sqlite_sequence WHERE name = 'simulations';

DROP TABLE simulations;
ALTER TABLE simulations_new RENAME TO simulations;

CREATE INDEX idx_simulations_customer ON simulations (customer_id, created_at DESC);
