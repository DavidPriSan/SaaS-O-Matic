import { describe, expect, it } from 'vitest';
import type { CountryCode } from '../catalog/countries';
import { computeQuote, type QuoteInput } from './computeQuote';
import { PricingInputError } from './errors';
import type { PlanId } from './plans';

const input = (overrides: Partial<QuoteInput> = {}): QuoteInput => ({
  activeUsers: 1,
  storageGb: 0,
  apiCalls: 0,
  plan: 'basic',
  countryCode: 'ES',
  ...overrides,
});

describe('computeQuote · spec 01 §5 acceptance examples', () => {
  it.each([
    { n: 1, activeUsers: 15, plan: 'basic', storageGb: 0, apiCalls: 0, countryCode: 'US', base: 14000, storage: 0, api: 0, subtotal: 14000, tax: 0, total: 14000 },
    { n: 2, activeUsers: 10, plan: 'basic', storageGb: 0, apiCalls: 0, countryCode: 'ES', base: 10000, storage: 0, api: 0, subtotal: 10000, tax: 2100, total: 12100 },
    { n: 3, activeUsers: 11, plan: 'basic', storageGb: 0, apiCalls: 0, countryCode: 'ES', base: 10800, storage: 0, api: 0, subtotal: 10800, tax: 2268, total: 13068 },
    { n: 4, activeUsers: 50, plan: 'basic', storageGb: 0, apiCalls: 0, countryCode: 'US', base: 42000, storage: 0, api: 0, subtotal: 42000, tax: 0, total: 42000 },
    { n: 5, activeUsers: 51, plan: 'basic', storageGb: 0, apiCalls: 0, countryCode: 'US', base: 42500, storage: 0, api: 0, subtotal: 42500, tax: 0, total: 42500 },
    { n: 6, activeUsers: 120, plan: 'basic', storageGb: 40, apiCalls: 80_000, countryCode: 'US', base: 77000, storage: 0, api: 0, subtotal: 77000, tax: 0, total: 77000 },
    { n: 7, activeUsers: 15, plan: 'pro', storageGb: 300, apiCalls: 1_250_500, countryCode: 'ES', base: 14000, storage: 1000, api: 2510, subtotal: 17510, tax: 3677, total: 21187 },
    { n: 8, activeUsers: 51, plan: 'enterprise', storageGb: 1000, apiCalls: 10_000_001, countryCode: 'DE', base: 42500, storage: 0, api: 10, subtotal: 42510, tax: 8077, total: 50587 },
    { n: 9, activeUsers: 1, plan: 'basic', storageGb: 0, apiCalls: 0, countryCode: 'MX', base: 1000, storage: 0, api: 0, subtotal: 1000, tax: 160, total: 1160 },
  ] as const)('example $n → total $total cents', (row) => {
    const quote = computeQuote({
      activeUsers: row.activeUsers,
      storageGb: row.storageGb,
      apiCalls: row.apiCalls,
      plan: row.plan,
      countryCode: row.countryCode,
    });

    expect(quote).toMatchObject({
      baseCents: row.base,
      storageOverageCents: row.storage,
      apiOverageCents: row.api,
      subtotalCents: row.subtotal,
      taxCents: row.tax,
      totalCents: row.total,
    });
  });
});

describe('computeQuote · overage', () => {
  it('does not charge storage up to the plan allowance', () => {
    expect(computeQuote(input({ plan: 'basic', storageGb: 50 })).storageOverageCents).toBe(0);
  });

  it('charges 20 cents per GB above the allowance', () => {
    const quote = computeQuote(input({ plan: 'basic', storageGb: 51 }));
    expect(quote.storageOverageGb).toBe(1);
    expect(quote.storageOverageCents).toBe(20);
  });

  it.each([
    [100_000, 0],
    [100_001, 1],
    [101_000, 1],
    [101_001, 2],
  ])('basic plan with %i API calls bills %i started blocks of 1,000', (apiCalls, blocks) => {
    const quote = computeQuote(input({ plan: 'basic', apiCalls }));
    expect(quote.apiOverageBlocks).toBe(blocks);
    expect(quote.apiOverageCents).toBe(blocks * 10);
  });
});

describe('computeQuote · tax and snapshot', () => {
  it('returns the tax rate applied in basis points and the pricing version', () => {
    const quote = computeQuote(input({ countryCode: 'PT' }));
    expect(quote.taxRateBp).toBe(2300);
    expect(quote.pricingVersion).toBe('2026-11-v1');
  });

  it('rounds tax half-up on cents', () => {
    // 1 user + 1 GB overage in PT: 1020 × 23 % = 234.6 → 235 (rounds up)
    expect(computeQuote(input({ activeUsers: 1, storageGb: 51, countryCode: 'PT' })).taxCents).toBe(235);
    // 1 user + 2 GB overage in PT: 1040 × 23 % = 239.2 → 239 (rounds down)
    expect(computeQuote(input({ activeUsers: 1, storageGb: 52, countryCode: 'PT' })).taxCents).toBe(239);
  });

  it('keeps total = subtotal + tax for every country', () => {
    for (const countryCode of ['ES', 'PT', 'FR', 'DE', 'IT', 'NL', 'IE', 'GB', 'US', 'MX'] as const) {
      const quote = computeQuote(input({ activeUsers: 37, storageGb: 77, apiCalls: 123_456, countryCode }));
      expect(quote.totalCents).toBe(quote.subtotalCents + quote.taxCents);
      expect(Number.isInteger(quote.taxCents)).toBe(true);
    }
  });
});

describe('computeQuote · invalid input', () => {
  it.each([
    ['activeUsers', 0],
    ['activeUsers', -1],
    ['activeUsers', 10.5],
    ['activeUsers', Number.NaN],
    ['activeUsers', 100_001],
    ['storageGb', -1],
    ['storageGb', 1.5],
    ['storageGb', 1_000_001],
    ['apiCalls', -1],
    ['apiCalls', 10_000_000_001],
  ] as const)('rejects %s = %s', (field, value) => {
    expect(() => computeQuote(input({ [field]: value }))).toThrow(PricingInputError);
  });

  it('rejects an unknown plan or country (untrusted runtime data)', () => {
    // Casts simulate values that bypassed the type system (e.g. raw JSON).
    expect(() => computeQuote(input({ plan: 'gold' as PlanId }))).toThrow(PricingInputError);
    expect(() => computeQuote(input({ countryCode: 'XX' as CountryCode }))).toThrow(PricingInputError);
  });

  it('reports which field is invalid', () => {
    try {
      computeQuote(input({ storageGb: -5 }));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PricingInputError);
      expect((error as PricingInputError).field).toBe('storageGb');
    }
  });
});
