import { describe, expect, it } from 'vitest';
import { createCustomerSchema, searchCustomersQuerySchema } from './customer';
import { idParamSchema } from './common';
import { createSimulationSchema } from './simulation';

const validCustomer = {
  companyName: '  Acme S.L. ',
  taxId: 'b-12345674',
  email: ' IT@Acme.ES ',
  countryCode: 'ES',
  plan: 'pro',
};

describe('createCustomerSchema', () => {
  it('trims, lowercases email, normalizes taxId and adds taxIdType', () => {
    expect(createCustomerSchema.parse(validCustomer)).toEqual({
      companyName: 'Acme S.L.',
      taxId: 'B12345674',
      taxIdType: 'CIF',
      email: 'it@acme.es',
      countryCode: 'ES',
      plan: 'pro',
    });
  });

  it('rejects an invalid Spanish tax id with the reason on the taxId path', () => {
    const result = createCustomerSchema.safeParse({ ...validCustomer, taxId: '12345678A' });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['taxId'], message: 'INVALID_CONTROL' })]);
  });

  it.each([
    ['companyName', 'A'],
    ['email', 'not-an-email'],
    ['countryCode', 'XX'],
    ['plan', 'gold'],
  ])('rejects invalid %s', (field, value) => {
    expect(createCustomerSchema.safeParse({ ...validCustomer, [field]: value }).success).toBe(false);
  });

  it('rejects unknown fields (strict contract)', () => {
    expect(createCustomerSchema.safeParse({ ...validCustomer, isAdmin: true }).success).toBe(false);
  });
});

describe('createSimulationSchema', () => {
  const valid = { customerId: 1, activeUsers: 15, storageGb: 300, apiCalls: 1_250_500 };

  it('accepts a valid body', () => {
    expect(createSimulationSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['activeUsers', 0],
    ['activeUsers', 2.5],
    ['storageGb', -1],
    ['apiCalls', 10_000_000_001],
    ['customerId', 0],
  ])('rejects %s = %s', (field, value) => {
    expect(createSimulationSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
  });

  it('rejects client-provided amounts or plan (server is the pricing authority)', () => {
    expect(createSimulationSchema.safeParse({ ...valid, totalCents: 1 }).success).toBe(false);
    expect(createSimulationSchema.safeParse({ ...valid, plan: 'basic' }).success).toBe(false);
  });
});

describe('searchCustomersQuerySchema', () => {
  it('defaults limit to 20 and coerces query-string numbers', () => {
    expect(searchCustomersQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(searchCustomersQuerySchema.parse({ q: ' acme ', limit: '5' })).toEqual({ q: 'acme', limit: 5 });
  });

  it('rejects limits out of range and overly long queries', () => {
    expect(searchCustomersQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(searchCustomersQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
  });
});

describe('idParamSchema', () => {
  it('coerces positive integer ids from the URL', () => {
    expect(idParamSchema.parse({ id: '42' })).toEqual({ id: 42 });
    expect(idParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
    expect(idParamSchema.safeParse({ id: '-1' }).success).toBe(false);
  });
});
