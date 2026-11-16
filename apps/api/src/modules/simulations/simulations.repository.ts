import {
  simulationSchema,
  type CountryCode,
  type PageQuery,
  type Page,
  type PlanId,
  type Quote,
  type Simulation,
} from '@saas/shared';
import type { Db } from '../../db/connection';
import { cursorParams, KEYSET_CONDITION, toPage, type CursorParams } from '../../db/pagination';

export interface NewSimulation {
  customerId: number;
  activeUsers: number;
  storageGb: number;
  apiCalls: number;
  plan: PlanId;
  countryCode: CountryCode;
  quote: Quote;
}

interface SimulationRow {
  id: number;
  customer_id: number;
  active_users: number;
  storage_gb: number;
  api_calls: number;
  plan: string;
  country_code: string;
  pricing_version: string;
  tier_breakdown: string;
  base_cents: number;
  storage_overage_gb: number;
  storage_overage_cents: number;
  api_overage_blocks: number;
  api_overage_cents: number;
  subtotal_cents: number;
  tax_rate_bp: number;
  tax_cents: number;
  total_cents: number;
  created_at: string;
}

type InsertParams = Omit<SimulationRow, 'id' | 'created_at'>;

function toRow(sim: NewSimulation): InsertParams {
  const { quote } = sim;
  return {
    customer_id: sim.customerId,
    active_users: sim.activeUsers,
    storage_gb: sim.storageGb,
    api_calls: sim.apiCalls,
    plan: sim.plan,
    country_code: sim.countryCode,
    pricing_version: quote.pricingVersion,
    tier_breakdown: JSON.stringify(quote.tiers),
    base_cents: quote.baseCents,
    storage_overage_gb: quote.storageOverageGb,
    storage_overage_cents: quote.storageOverageCents,
    api_overage_blocks: quote.apiOverageBlocks,
    api_overage_cents: quote.apiOverageCents,
    subtotal_cents: quote.subtotalCents,
    tax_rate_bp: quote.taxRateBp,
    tax_cents: quote.taxCents,
    total_cents: quote.totalCents,
  };
}

function toSimulation(row: SimulationRow): Simulation {
  return simulationSchema.parse({
    id: row.id,
    customerId: row.customer_id,
    activeUsers: row.active_users,
    storageGb: row.storage_gb,
    apiCalls: row.api_calls,
    plan: row.plan,
    countryCode: row.country_code,
    createdAt: row.created_at,
    quote: {
      pricingVersion: row.pricing_version,
      tiers: JSON.parse(row.tier_breakdown) as unknown, // validated by simulationSchema below
      baseCents: row.base_cents,
      storageOverageGb: row.storage_overage_gb,
      storageOverageCents: row.storage_overage_cents,
      apiOverageBlocks: row.api_overage_blocks,
      apiOverageCents: row.api_overage_cents,
      subtotalCents: row.subtotal_cents,
      taxRateBp: row.tax_rate_bp,
      taxCents: row.tax_cents,
      totalCents: row.total_cents,
    },
  });
}

export function createSimulationsRepository(db: Db) {
  const insertStmt = db.prepare<InsertParams, SimulationRow>(`
    INSERT INTO simulations (
      customer_id, active_users, storage_gb, api_calls, plan, country_code, pricing_version, tier_breakdown,
      base_cents, storage_overage_gb, storage_overage_cents, api_overage_blocks, api_overage_cents,
      subtotal_cents, tax_rate_bp, tax_cents, total_cents
    ) VALUES (
      @customer_id, @active_users, @storage_gb, @api_calls, @plan, @country_code, @pricing_version, @tier_breakdown,
      @base_cents, @storage_overage_gb, @storage_overage_cents, @api_overage_blocks, @api_overage_cents,
      @subtotal_cents, @tax_rate_bp, @tax_cents, @total_cents
    )
    RETURNING *`);

  const listStmt = db.prepare<{ customerId: number } & CursorParams, SimulationRow>(`
    SELECT * FROM simulations
    WHERE customer_id = @customerId AND ${KEYSET_CONDITION}
    ORDER BY created_at DESC, id DESC
    LIMIT @fetchLimit`);

  return {
    insert(simulation: NewSimulation): Simulation {
      const row = insertStmt.get(toRow(simulation));
      if (!row) throw new Error('INSERT … RETURNING produced no row');
      return toSimulation(row);
    },

    listByCustomer(customerId: number, { limit, cursor }: PageQuery): Page<Simulation> {
      return toPage(listStmt.all({ customerId, ...cursorParams(limit, cursor) }), limit, toSimulation);
    },
  };
}

export type SimulationsRepository = ReturnType<typeof createSimulationsRepository>;
