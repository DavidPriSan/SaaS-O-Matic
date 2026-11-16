import { z } from 'zod';
import { COUNTRY_CODES } from '../catalog/countries';
import { QUOTE_LIMITS, type Quote } from '../pricing/computeQuote';
import { PLAN_IDS } from '../pricing/plans';

const boundedInt = ({ min, max }: { min: number; max: number }) => z.number().int().min(min).max(max);

/**
 * POST /simulations body (spec 03). Strict: plan, country and amounts are never accepted
 * from the client; the server derives them from the stored customer and recalculates.
 */
export const createSimulationSchema = z.strictObject({
  customerId: z.number().int().positive(),
  activeUsers: boundedInt(QUOTE_LIMITS.activeUsers),
  storageGb: boundedInt(QUOTE_LIMITS.storageGb),
  apiCalls: boundedInt(QUOTE_LIMITS.apiCalls),
});

export type CreateSimulationInput = z.infer<typeof createSimulationSchema>;

const tierLineSchema = z.object({
  from: z.number(),
  to: z.number().nullable(),
  units: z.number(),
  unitPriceCents: z.number(),
  amountCents: z.number(),
});

/** Annotated with `Quote` so the schema and the pricing type cannot drift apart. */
export const quoteSchema: z.ZodType<Quote> = z.object({
  pricingVersion: z.string(),
  tiers: z.array(tierLineSchema),
  baseCents: z.number(),
  storageOverageGb: z.number(),
  storageOverageCents: z.number(),
  apiOverageBlocks: z.number(),
  apiOverageCents: z.number(),
  subtotalCents: z.number(),
  taxRateBp: z.number(),
  taxCents: z.number(),
  totalCents: z.number(),
});

export const simulationSchema = z.object({
  id: z.number().int().positive(),
  customerId: z.number().int().positive(),
  activeUsers: z.number(),
  storageGb: z.number(),
  apiCalls: z.number(),
  plan: z.enum(PLAN_IDS),
  countryCode: z.enum(COUNTRY_CODES),
  quote: quoteSchema,
  createdAt: z.string(),
});

export type Simulation = z.infer<typeof simulationSchema>;

export const simulationListResponseSchema = z.object({ items: z.array(simulationSchema) });
