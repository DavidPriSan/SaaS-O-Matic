import {
  simulationListResponseSchema,
  simulationSchema,
  type CreateSimulationInput,
  type Page,
  type Simulation,
} from '@saas/shared';
import { apiRequest } from './http';

export const simulationKeys = {
  byCustomer: (customerId: number) => ['simulations', 'customer', customerId] as const,
};

export function fetchSimulations(
  customerId: number,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Simulation>> {
  const query = cursor === null ? '' : `?${new URLSearchParams({ cursor })}`;
  return apiRequest(`/customers/${customerId}/simulations${query}`, { schema: simulationListResponseSchema, signal });
}

/** Only usage figures are sent: plan, country and amounts are decided by the server. */
export function createSimulation(input: CreateSimulationInput): Promise<Simulation> {
  return apiRequest('/simulations', { method: 'POST', body: input, schema: simulationSchema });
}
