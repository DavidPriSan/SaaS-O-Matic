import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, validCustomer, type TestContext } from '../../testing/createTestApp';

let ctx: TestContext;
let customerId: number;

beforeEach(async () => {
  ctx = await createTestApp();
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/customers',
    payload: validCustomer({ plan: 'pro', countryCode: 'ES' }),
  });
  customerId = res.json().id;
});

afterEach(async () => {
  await ctx.close();
});

const postSimulation = (payload: object) => ctx.app.inject({ method: 'POST', url: '/simulations', payload });
const listSimulations = (id: number, query = '') =>
  ctx.app.inject({ method: 'GET', url: `/customers/${id}/simulations${query}` });

describe('POST /simulations', () => {
  it('computes the quote server-side with the customer plan and country (spec 01, example 7)', async () => {
    const res = await postSimulation({ customerId, activeUsers: 15, storageGb: 300, apiCalls: 1_250_500 });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      id: expect.any(Number),
      customerId,
      plan: 'pro',
      countryCode: 'ES',
      quote: {
        pricingVersion: '2026-11-v1',
        baseCents: 14000,
        storageOverageGb: 50,
        storageOverageCents: 1000,
        apiOverageBlocks: 251,
        apiOverageCents: 2510,
        subtotalCents: 17510,
        taxRateBp: 2100,
        taxCents: 3677,
        totalCents: 21187,
        tiers: [
          { from: 1, to: 10, units: 10, unitPriceCents: 1000, amountCents: 10000 },
          { from: 11, to: 50, units: 5, unitPriceCents: 800, amountCents: 4000 },
        ],
      },
    });
  });

  it('persists the simulation and returns it identically when read back', async () => {
    const created = (await postSimulation({ customerId, activeUsers: 51, storageGb: 0, apiCalls: 0 })).json();
    const { items } = (await listSimulations(customerId)).json();

    expect(items).toEqual([created]);
  });

  it('rejects client-provided amounts or plan (server is the pricing authority)', async () => {
    const res = await postSimulation({
      customerId,
      activeUsers: 15,
      storageGb: 0,
      apiCalls: 0,
      totalCents: 1,
      plan: 'basic',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['zero users', { activeUsers: 0 }],
    ['decimal users', { activeUsers: 2.5 }],
    ['negative storage', { storageGb: -1 }],
    ['api calls as string', { apiCalls: '1000' }],
  ])('rejects %s with 400', async (_label, override) => {
    const res = await postSimulation({ customerId, activeUsers: 10, storageGb: 0, apiCalls: 0, ...override });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when the customer does not exist', async () => {
    const res = await postSimulation({ customerId: 999, activeUsers: 10, storageGb: 0, apiCalls: 0 });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});

describe('GET /customers/:id/simulations', () => {
  it('returns an empty list for a customer without simulations', async () => {
    expect((await listSimulations(customerId)).json()).toEqual({ items: [], nextCursor: null });
  });

  it('lists simulations newest first', async () => {
    for (const activeUsers of [5, 25, 75]) {
      await postSimulation({ customerId, activeUsers, storageGb: 0, apiCalls: 0 });
    }
    const { items } = (await listSimulations(customerId)).json();

    expect(items.map((s: { activeUsers: number }) => s.activeUsers)).toEqual([75, 25, 5]);
  });

  it('pages the history with limit and nextCursor', async () => {
    for (const activeUsers of [5, 25, 75]) {
      await postSimulation({ customerId, activeUsers, storageGb: 0, apiCalls: 0 });
    }
    const users = (items: Array<{ activeUsers: number }>) => items.map((s) => s.activeUsers);

    const first = (await listSimulations(customerId, '?limit=2')).json();
    expect(users(first.items)).toEqual([75, 25]);
    const second = (
      await listSimulations(customerId, `?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`)
    ).json();
    expect(users(second.items)).toEqual([5]);
    expect(second.nextCursor).toBeNull();
  });

  it('rejects an out-of-range limit or a malformed cursor with 400', async () => {
    expect((await listSimulations(customerId, '?limit=51')).statusCode).toBe(400);
    expect((await listSimulations(customerId, '?cursor=nope')).statusCode).toBe(400);
  });

  it('returns 404 for an unknown customer', async () => {
    expect((await listSimulations(999)).statusCode).toBe(404);
  });
});
