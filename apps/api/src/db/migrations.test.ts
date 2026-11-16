import { COUNTRY_CODES, PLAN_IDS, QUOTE_LIMITS } from '@saas/shared';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from './connection';
import { runMigrations } from './migrate';

// A consistent row (pro, ES, 15 users = 169,40 €) that each test breaks in exactly one column.
const validRow = {
  active_users: 15,
  storage_gb: 0,
  api_calls: 0,
  plan: 'pro',
  country_code: 'ES',
  pricing_version: '2026-11-v1',
  tier_breakdown: '[]',
  base_cents: 14000,
  storage_overage_gb: 0,
  storage_overage_cents: 0,
  api_overage_blocks: 0,
  api_overage_cents: 0,
  subtotal_cents: 14000,
  tax_rate_bp: 2100,
  tax_cents: 2940,
  total_cents: 16940,
};
type Row = typeof validRow;

let db: Db;
let customerId: number;

function insertSimulation(overrides: Partial<Row> = {}): void {
  const row = { ...validRow, ...overrides, customer_id: customerId };
  const columns = Object.keys(row);
  db.prepare(`INSERT INTO simulations (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`).run(
    row,
  );
}

function insertCustomer(): number {
  const result = db
    .prepare(
      `INSERT INTO customers (company_name, tax_id, tax_id_type, email, country_code, plan)
       VALUES ('Acme', 'B12345674', 'CIF', 'it@acme.es', 'ES', 'pro')`,
    )
    .run();
  return Number(result.lastInsertRowid);
}

describe('simulations CHECK constraints (migration 002, defense in depth)', () => {
  beforeEach(() => {
    db = openDatabase(':memory:');
    runMigrations(db);
    customerId = insertCustomer();
  });

  afterEach(() => db.close());

  it('accepts a consistent row and every plan and country of the shared catalog', () => {
    for (const plan of PLAN_IDS) insertSimulation({ plan });
    // Fails if a country is added to the catalog without a migration updating the CHECK.
    for (const country_code of COUNTRY_CODES) insertSimulation({ country_code });
  });

  it.each<[string, Partial<Row>]>([
    ['unknown plan', { plan: 'gold' }],
    ['unknown country', { country_code: 'XX' }],
    ['users above the maximum', { active_users: QUOTE_LIMITS.activeUsers.max + 1 }],
    ['storage above the maximum', { storage_gb: QUOTE_LIMITS.storageGb.max + 1 }],
    ['API calls above the maximum', { api_calls: QUOTE_LIMITS.apiCalls.max + 1 }],
    ['negative amount', { storage_overage_cents: -1 }],
    ['VAT rate above 100 %', { tax_rate_bp: 10_001 }],
    // total stays = subtotal + tax, so only the subtotal rule can reject it
    ['subtotal ≠ base + extras', { subtotal_cents: 14_001, total_cents: 16_941 }],
  ])('rejects %s', (_case, overrides) => {
    expect(() => insertSimulation(overrides)).toThrow(/CHECK constraint failed/);
  });
});

describe('migration 002 on an existing database', () => {
  let legacyDir: string;

  beforeEach(() => {
    legacyDir = mkdtempSync(join(tmpdir(), 'saas-migrations-'));
    const migrations = fileURLToPath(new URL('./migrations', import.meta.url));
    copyFileSync(join(migrations, '001_init.sql'), join(legacyDir, '001_init.sql'));
    db = openDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
    rmSync(legacyDir, { recursive: true, force: true });
  });

  it('keeps existing simulations, their ids, the id sequence and the history index', () => {
    expect(runMigrations(db, legacyDir)).toEqual(['001_init.sql']);
    customerId = insertCustomer();
    insertSimulation();
    insertSimulation({
      active_users: 20,
      base_cents: 18000,
      subtotal_cents: 18000,
      tax_cents: 3780,
      total_cents: 21780,
    });

    insertSimulation();
    db.prepare('DELETE FROM simulations WHERE id = 3').run();

    expect(runMigrations(db)).toEqual(['002_simulations_checks.sql']);

    const rows = db.prepare('SELECT id, active_users FROM simulations ORDER BY id').all();
    expect(rows).toEqual([
      { id: 1, active_users: 15 },
      { id: 2, active_users: 20 },
    ]);
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'simulations'")
      .all();
    expect(indexes).toContainEqual({ name: 'idx_simulations_customer' });
    expect(() => insertSimulation({ plan: 'gold' })).toThrow(/CHECK constraint failed/);
    // AUTOINCREMENT must not hand out the id of a deleted simulation again.
    insertSimulation();
    expect(db.prepare('SELECT max(id) AS id FROM simulations').get()).toEqual({ id: 4 });
  });
});
