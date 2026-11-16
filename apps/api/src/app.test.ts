import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from './db/migrate';
import { createTestApp, TEST_CORS_ORIGIN, validCustomer, type TestContext } from './testing/createTestApp';

let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestApp();
});

afterEach(async () => {
  await ctx.close();
});

describe('infrastructure', () => {
  it('GET /health → ok', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('unknown routes use the error envelope', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('GET /meta/pricing exposes the pricing catalog', async () => {
    const body = (await ctx.app.inject({ method: 'GET', url: '/meta/pricing' })).json();
    expect(body.pricingVersion).toBe('2026-11-v1');
    expect(body.tiers).toHaveLength(3);
    expect(body.plans.map((p: { id: string }) => p.id)).toEqual(['basic', 'pro', 'enterprise']);
    expect(body.countries).toContainEqual({ code: 'ES', name: 'España', taxRateBp: 2100 });
  });

  it('allows CORS only for the configured origin', async () => {
    const allowed = await ctx.app.inject({ method: 'GET', url: '/health', headers: { origin: TEST_CORS_ORIGIN } });
    const denied = await ctx.app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://evil.example' } });

    expect(allowed.headers['access-control-allow-origin']).toBe(TEST_CORS_ORIGIN);
    expect(denied.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });

  it('hides internal details of unexpected errors behind a generic 500', async () => {
    ctx.app.get('/boom', () => {
      throw new Error('SQLITE secret internal detail');
    });

    const res = await ctx.app.inject({ method: 'GET', url: '/boom' });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
    expect(res.body).not.toContain('secret');
  });

  it('rejects bodies above the size limit', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/customers',
      payload: { ...validCustomer(), companyName: 'x'.repeat(20_000) },
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('database', () => {
  it('migrations are idempotent', () => {
    expect(runMigrations(ctx.db)).toEqual([]);
  });

  it('enforces total = subtotal + tax at the database level (defense in depth)', async () => {
    const { id } = (await ctx.app.inject({ method: 'POST', url: '/customers', payload: validCustomer() })).json();
    const insertInconsistent = () =>
      ctx.db
        .prepare(
          `INSERT INTO simulations (customer_id, active_users, storage_gb, api_calls, plan, country_code, pricing_version,
             tier_breakdown, base_cents, storage_overage_gb, storage_overage_cents, api_overage_blocks, api_overage_cents,
             subtotal_cents, tax_rate_bp, tax_cents, total_cents)
           VALUES (?, 1, 0, 0, 'basic', 'ES', 'v', '[]', 1000, 0, 0, 0, 0, 1000, 2100, 210, 999)`,
        )
        .run(id);

    expect(insertInconsistent).toThrow(/CHECK constraint failed/);
  });

  it('enforces foreign keys', () => {
    const orphan = () =>
      ctx.db
        .prepare(
          `INSERT INTO simulations (customer_id, active_users, storage_gb, api_calls, plan, country_code, pricing_version,
             tier_breakdown, base_cents, storage_overage_gb, storage_overage_cents, api_overage_blocks, api_overage_cents,
             subtotal_cents, tax_rate_bp, tax_cents, total_cents)
           VALUES (999, 1, 0, 0, 'basic', 'ES', 'v', '[]', 1000, 0, 0, 0, 0, 1000, 2100, 210, 1210)`,
        )
        .run();

    expect(orphan).toThrow(/FOREIGN KEY constraint failed/);
  });
});
