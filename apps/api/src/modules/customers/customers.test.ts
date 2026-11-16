import type { CreateCustomerInput } from '@saas/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, validCustomer, type TestContext } from '../../testing/createTestApp';

let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestApp();
});

afterEach(async () => {
  await ctx.close();
});

const postCustomer = (payload: unknown) =>
  ctx.app.inject({ method: 'POST', url: '/customers', payload: payload as object });

async function seedCustomers(customers: CreateCustomerInput[]): Promise<void> {
  for (const customer of customers) {
    const res = await postCustomer(customer);
    expect(res.statusCode).toBe(201);
  }
}

describe('POST /customers', () => {
  it('creates a customer with normalized tax ID and detected type', async () => {
    const res = await postCustomer(validCustomer({ taxId: 'b-1234567-4', email: 'IT@Acme.ES' }));

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      id: expect.any(Number),
      companyName: 'Acme Ibérica S.L.',
      taxId: 'B12345674',
      taxIdType: 'CIF',
      email: 'it@acme.es',
      countryCode: 'ES',
      plan: 'pro',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
  });

  it('rejects a Spanish ID with a wrong control character (400 + reason)', async () => {
    const res = await postCustomer(validCustomer({ taxId: '12345678A' }));

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        details: [{ path: 'taxId', message: 'INVALID_CONTROL' }],
      },
    });
  });

  it('applies only the generic format check outside Spain', async () => {
    const res = await postCustomer(validCustomer({ taxId: '12345678A', countryCode: 'FR' }));
    expect(res.statusCode).toBe(201);
  });

  it('returns 409 for the same tax ID in the same country, regardless of formatting', async () => {
    await seedCustomers([validCustomer()]);
    const res = await postCustomer(validCustomer({ taxId: 'b 1234 5674', companyName: 'Other' }));

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CONFLICT');
  });

  it('allows the same tax ID string in a different country', async () => {
    await seedCustomers([validCustomer({ taxId: 'ABC12345', countryCode: 'FR' })]);
    const res = await postCustomer(validCustomer({ taxId: 'ABC12345', countryCode: 'DE' }));
    expect(res.statusCode).toBe(201);
  });

  it.each([
    ['unknown fields', { ...validCustomer(), isAdmin: true }],
    ['missing fields', { companyName: 'Acme' }],
    ['invalid email', validCustomer({ email: 'nope' })],
    ['unknown country', { ...validCustomer(), countryCode: 'XX' }],
  ])('rejects %s with 400', async (_label, payload) => {
    const res = await postCustomer(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects control characters in the company name with 400, not a DB CHECK 500 (audit finding)', async () => {
    // SQLite length() stops at NUL: Zod saw 5 chars, the CHECK saw 0 → previously an unhandled 500.
    const res = await postCustomer(validCustomer({ companyName: '\u0000\u0000abc' }));

    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].path).toBe('companyName');
  });

  it('returns the error envelope for malformed JSON', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/customers',
      headers: { 'content-type': 'application/json' },
      payload: '{"companyName": ',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /customers (search)', () => {
  beforeEach(async () => {
    await seedCustomers([
      validCustomer({ companyName: 'Acme Ibérica S.L.', taxId: 'B12345674' }),
      validCustomer({ companyName: 'Nébula Analytics', taxId: 'A58818501' }),
      validCustomer({ companyName: '100% Cloud', taxId: '12345678Z' }),
    ]);
  });

  const search = async (query: string) => {
    const res = await ctx.app.inject({ method: 'GET', url: `/customers${query}` });
    expect(res.statusCode).toBe(200);
    return (res.json().items as Array<{ companyName: string }>).map((c) => c.companyName);
  };

  it('returns the latest customers first when there is no query', async () => {
    expect(await search('')).toEqual(['100% Cloud', 'Nébula Analytics', 'Acme Ibérica S.L.']);
  });

  it('matches company name case-insensitively (contains)', async () => {
    expect(await search('?q=ANALYTICS')).toEqual(['Nébula Analytics']);
  });

  it('is case- and accent-insensitive for non-ASCII names (bug found in manual testing)', async () => {
    expect(await search(`?q=${encodeURIComponent('NÉBULA')}`)).toEqual(['Nébula Analytics']);
    expect(await search('?q=nebula')).toEqual(['Nébula Analytics']);
    expect(await search(`?q=${encodeURIComponent('IBÉRICA')}`)).toEqual(['Acme Ibérica S.L.']);
  });

  it('matches tax ID by prefix, ignoring formatting', async () => {
    expect(await search('?q=b-1234')).toEqual(['Acme Ibérica S.L.']);
  });

  it('treats LIKE wildcards literally', async () => {
    expect(await search(`?q=${encodeURIComponent('%')}`)).toEqual(['100% Cloud']);
    expect(await search('?q=_')).toEqual([]);
  });

  it('is safe against SQL injection attempts', async () => {
    expect(await search(`?q=${encodeURIComponent("' OR 1=1 --")}`)).toEqual([]);
  });

  const page = async (query: string) => {
    const res = await ctx.app.inject({ method: 'GET', url: `/customers${query}` });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ items: Array<{ companyName: string }>; nextCursor: string | null }>();
    return { names: body.items.map((c) => c.companyName), nextCursor: body.nextCursor };
  };
  const after = (cursor: string | null) => encodeURIComponent(cursor ?? '');

  it('pages with nextCursor until it is null (spec 03, Paginación)', async () => {
    const first = await page('?limit=2');
    expect(first.names).toEqual(['100% Cloud', 'Nébula Analytics']);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await page(`?limit=2&cursor=${after(first.nextCursor)}`);
    expect(second).toEqual({ names: ['Acme Ibérica S.L.'], nextCursor: null });
  });

  it('keeps the filter across pages and neither repeats nor skips when a customer is added meanwhile', async () => {
    const first = await page('?q=a&limit=1');
    expect(first.names).toEqual(['Nébula Analytics']);
    await seedCustomers([validCustomer({ companyName: 'Zeta Analytics', taxId: '87654321X' })]);

    const second = await page(`?q=a&limit=1&cursor=${after(first.nextCursor)}`);
    expect(second).toEqual({ names: ['Acme Ibérica S.L.'], nextCursor: null });
  });

  it('breaks createdAt ties by id, so equal timestamps are not lost between pages', async () => {
    ctx.db.prepare("UPDATE customers SET created_at = '2026-01-01T00:00:00.000Z'").run();
    const names: string[] = [];
    let cursor: string | null = null;
    do {
      const result: { names: string[]; nextCursor: string | null } = await page(
        `?limit=1${cursor ? `&cursor=${after(cursor)}` : ''}`,
      );
      names.push(...result.names);
      cursor = result.nextCursor;
    } while (cursor);
    expect(names).toEqual(['100% Cloud', 'Nébula Analytics', 'Acme Ibérica S.L.']);
  });

  it('rejects a malformed cursor with 400 on the cursor field', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: `/customers?cursor=${encodeURIComponent("x' OR 1=1")}` });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details).toEqual([{ path: 'cursor', message: 'INVALID_CURSOR' }]);
  });

  it('honours the limit and rejects out-of-range values', async () => {
    expect(await search('?limit=1')).toHaveLength(1);
    const res = await ctx.app.inject({ method: 'GET', url: '/customers?limit=500' });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /customers/:id', () => {
  it('returns the customer', async () => {
    const created = (await postCustomer(validCustomer())).json();
    const res = await ctx.app.inject({ method: 'GET', url: `/customers/${created.id}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(created);
  });

  it('returns 404 for an unknown id and 400 for a non-numeric one', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/customers/999' })).statusCode).toBe(404);
    expect((await ctx.app.inject({ method: 'GET', url: '/customers/abc' })).statusCode).toBe(400);
  });

  it.each(['0x1', '1e0', '%201', '01', '1.0'])('rejects the non-canonical id %s (audit finding)', async (id) => {
    await postCustomer(validCustomer());
    expect((await ctx.app.inject({ method: 'GET', url: `/customers/${id}` })).statusCode).toBe(400);
  });
});
