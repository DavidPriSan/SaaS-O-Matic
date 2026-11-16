export const PLAN_IDS = ['basic', 'pro', 'enterprise'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanInfo {
  readonly id: PlanId;
  readonly name: string;
  readonly includedStorageGb: number;
  readonly includedApiCalls: number;
}

/** Plans only define included allowances; user tiers are the same for all (spec 01 §3). */
export const PLANS: Readonly<Record<PlanId, PlanInfo>> = {
  basic: { id: 'basic', name: 'Basic', includedStorageGb: 50, includedApiCalls: 100_000 },
  pro: { id: 'pro', name: 'Pro', includedStorageGb: 250, includedApiCalls: 1_000_000 },
  enterprise: { id: 'enterprise', name: 'Enterprise', includedStorageGb: 1000, includedApiCalls: 10_000_000 },
};

export const OVERAGE = {
  storageCentsPerGb: 20,
  apiCallsBlockSize: 1000,
  apiCentsPerBlock: 10,
} as const;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && Object.hasOwn(PLANS, value);
}
