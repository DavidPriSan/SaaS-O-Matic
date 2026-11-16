import {
  simulationListResponseSchema,
  simulationSchema,
  type CreateSimulationInput,
  type Simulation,
} from '@saas/shared';
import { apiRequest } from './http';

export const simulationKeys = {
  byCustomer: (customerId: number) => ['simulations', 'customer', customerId] as const,
};

export async function fetchSimulations(customerId: number, signal?: AbortSignal): Promise<Simulation[]> {
  const { items } = await apiRequest(`/customers/${customerId}/simulations`, {
    schema: simulationListResponseSchema,
    signal,
  });
  return items;
}

/** Only usage figures are sent: plan, country and amounts are decided by the server. */
export function createSimulation(input: CreateSimulationInput): Promise<Simulation> {
  return apiRequest('/simulations', { method: 'POST', body: input, schema: simulationSchema });
}
