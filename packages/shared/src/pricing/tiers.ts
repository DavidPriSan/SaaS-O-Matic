export interface PriceTier {
  /** Inclusive upper bound of the tier; `null` means open-ended. */
  readonly upTo: number | null;
  readonly unitPriceCents: number;
}

export interface TierLine {
  readonly from: number;
  readonly to: number | null;
  readonly units: number;
  readonly unitPriceCents: number;
  readonly amountCents: number;
}

export interface TieredCost {
  readonly lines: TierLine[];
  readonly totalCents: number;
}

/** Cumulative per-user tiers (spec 01 §2). */
export const USER_TIERS: readonly PriceTier[] = [
  { upTo: 10, unitPriceCents: 1000 },
  { upTo: 50, unitPriceCents: 800 },
  { upTo: null, unitPriceCents: 500 },
];

/**
 * Graduated (cumulative) pricing: each tier charges only the units that fall inside it.
 * Data-driven: changing the tier table never requires touching this algorithm.
 */
export function computeTieredCost(units: number, tiers: readonly PriceTier[] = USER_TIERS): TieredCost {
  const lines: TierLine[] = [];
  let remaining = units;
  let lowerBound = 0;

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const capacity = tier.upTo === null ? remaining : tier.upTo - lowerBound;
    if (capacity <= 0) {
      throw new Error('Tier table must have strictly increasing upper bounds');
    }
    const taken = Math.min(remaining, capacity);
    lines.push({
      from: lowerBound + 1,
      to: tier.upTo,
      units: taken,
      unitPriceCents: tier.unitPriceCents,
      amountCents: taken * tier.unitPriceCents,
    });
    remaining -= taken;
    lowerBound = tier.upTo ?? lowerBound;
  }

  if (remaining > 0) {
    throw new Error('Tier table is not open-ended: units exceed the last tier');
  }

  return { lines, totalCents: lines.reduce((sum, line) => sum + line.amountCents, 0) };
}
