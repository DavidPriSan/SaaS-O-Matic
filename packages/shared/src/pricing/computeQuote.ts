import { COUNTRIES, isCountryCode, type CountryCode } from '../catalog/countries';
import { PricingInputError } from './errors';
import { isPlanId, OVERAGE, PLANS, type PlanId } from './plans';
import { computeTieredCost, type TierLine } from './tiers';

export const PRICING_VERSION = '2026-11-v1';

export const QUOTE_LIMITS = {
  activeUsers: { min: 1, max: 100_000 },
  storageGb: { min: 0, max: 1_000_000 },
  apiCalls: { min: 0, max: 10_000_000_000 },
} as const;

export interface QuoteInput {
  activeUsers: number;
  storageGb: number;
  apiCalls: number;
  plan: PlanId;
  countryCode: CountryCode;
}

export interface Quote {
  pricingVersion: string;
  tiers: TierLine[];
  baseCents: number;
  storageOverageGb: number;
  storageOverageCents: number;
  apiOverageBlocks: number;
  apiOverageCents: number;
  subtotalCents: number;
  taxRateBp: number;
  taxCents: number;
  totalCents: number;
}

/** Monthly quote in EUR cents (spec 01). Pure and deterministic. */
export function computeQuote(input: QuoteInput): Quote {
  assertValidInput(input);

  const plan = PLANS[input.plan];
  const { lines, totalCents: baseCents } = computeTieredCost(input.activeUsers);

  const storageOverageGb = Math.max(0, input.storageGb - plan.includedStorageGb);
  const storageOverageCents = storageOverageGb * OVERAGE.storageCentsPerGb;

  const extraApiCalls = Math.max(0, input.apiCalls - plan.includedApiCalls);
  const apiOverageBlocks = Math.ceil(extraApiCalls / OVERAGE.apiCallsBlockSize);
  const apiOverageCents = apiOverageBlocks * OVERAGE.apiCentsPerBlock;

  const subtotalCents = baseCents + storageOverageCents + apiOverageCents;
  const { taxRateBp } = COUNTRIES[input.countryCode];
  const taxCents = applyTax(subtotalCents, taxRateBp);

  return {
    pricingVersion: PRICING_VERSION,
    tiers: lines,
    baseCents,
    storageOverageGb,
    storageOverageCents,
    apiOverageBlocks,
    apiOverageCents,
    subtotalCents,
    taxRateBp,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

/** Half-up rounding using integer arithmetic only. */
function applyTax(amountCents: number, taxRateBp: number): number {
  return Math.floor((amountCents * taxRateBp + 5000) / 10000);
}

function assertValidInput(input: QuoteInput): void {
  for (const field of ['activeUsers', 'storageGb', 'apiCalls'] as const) {
    const { min, max } = QUOTE_LIMITS[field];
    const value = input[field];
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new PricingInputError(field, `${field} must be an integer between ${min} and ${max}`);
    }
  }
  if (!isPlanId(input.plan)) {
    throw new PricingInputError('plan', `Unknown plan: ${String(input.plan)}`);
  }
  if (!isCountryCode(input.countryCode)) {
    throw new PricingInputError('countryCode', `Unknown country: ${String(input.countryCode)}`);
  }
}
