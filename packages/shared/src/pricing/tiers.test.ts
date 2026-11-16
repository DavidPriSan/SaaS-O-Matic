import { describe, expect, it } from 'vitest';
import { computeTieredCost, USER_TIERS } from './tiers';

describe('computeTieredCost', () => {
  it('charges the PDF example (15 users) as 10 × 10 € + 5 × 8 €', () => {
    const result = computeTieredCost(15);

    expect(result.totalCents).toBe(14000);
    expect(result.lines).toEqual([
      { from: 1, to: 10, units: 10, unitPriceCents: 1000, amountCents: 10000 },
      { from: 11, to: 50, units: 5, unitPriceCents: 800, amountCents: 4000 },
    ]);
  });

  it.each([
    [1, 1000],
    [10, 10000],
    [11, 10800],
    [50, 42000],
    [51, 42500],
    [120, 77000],
  ])('%i users cost %i cents (tier boundaries)', (users, expectedCents) => {
    expect(computeTieredCost(users).totalCents).toBe(expectedCents);
  });

  it('treats the last tier as open-ended', () => {
    const { lines } = computeTieredCost(120);

    expect(lines.at(-1)).toEqual({ from: 51, to: null, units: 70, unitPriceCents: 500, amountCents: 35000 });
  });

  it('only returns tiers that contain units', () => {
    expect(computeTieredCost(7).lines).toHaveLength(1);
  });

  it('is driven by the tier table, not hardcoded thresholds', () => {
    const customTiers = [
      { upTo: 2, unitPriceCents: 100 },
      { upTo: null, unitPriceCents: 1 },
    ];

    expect(computeTieredCost(5, customTiers).totalCents).toBe(2 * 100 + 3 * 1);
  });

  it('throws when the tier table is not open-ended and units overflow it', () => {
    expect(() => computeTieredCost(5, [{ upTo: 3, unitPriceCents: 100 }])).toThrow();
  });

  it('throws on a misordered tier table instead of producing negative lines', () => {
    const misordered = [
      { upTo: 10, unitPriceCents: 1000 },
      { upTo: 5, unitPriceCents: 800 },
      { upTo: null, unitPriceCents: 500 },
    ];
    expect(() => computeTieredCost(20, misordered)).toThrow(/strictly increasing/);
  });

  describe('invariants (1…300 users)', () => {
    const range = Array.from({ length: 300 }, (_, i) => i + 1);

    it('distributes exactly all units across tiers', () => {
      for (const users of range) {
        const units = computeTieredCost(users).lines.reduce((sum, line) => sum + line.units, 0);
        expect(units).toBe(users);
      }
    });

    it('is monotonic and its marginal cost never increases', () => {
      let previousTotal = 0;
      let previousMarginal = Number.POSITIVE_INFINITY;
      for (const users of range) {
        const total = computeTieredCost(users).totalCents;
        const marginal = total - previousTotal;
        expect(marginal).toBeGreaterThan(0);
        expect(marginal).toBeLessThanOrEqual(previousMarginal);
        previousTotal = total;
        previousMarginal = marginal;
      }
    });
  });

  it('exposes the official tier table from spec 01 §2', () => {
    expect(USER_TIERS).toEqual([
      { upTo: 10, unitPriceCents: 1000 },
      { upTo: 50, unitPriceCents: 800 },
      { upTo: null, unitPriceCents: 500 },
    ]);
  });
});
