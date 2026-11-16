import { computeQuote, type CountryCode, type CreateSimulationInput, type PlanId, type Simulation } from '@saas/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { createSimulation, fetchSimulations, simulationKeys } from '../../api/simulations';

export type SimulatorInputs = Omit<CreateSimulationInput, 'customerId'>;

export const DEFAULT_INPUTS: SimulatorInputs = { activeUsers: 10, storageGb: 0, apiCalls: 0 };

export function useSimulatorInputs(initial: SimulatorInputs = DEFAULT_INPUTS) {
  const [inputs, setInputs] = useState<SimulatorInputs>(initial);
  const setInput = useCallback(
    (key: keyof SimulatorInputs, value: number) => setInputs((current) => ({ ...current, [key]: value })),
    [],
  );
  return { inputs, setInput, setInputs };
}

export function useSimulations(customerId: number) {
  return useQuery({
    queryKey: simulationKeys.byCustomer(customerId),
    queryFn: ({ signal }) => fetchSimulations(customerId, signal),
  });
}

export function useCreateSimulation(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSimulation,
    onSuccess: (simulation) => {
      // The server returns the persisted row: prepend it instead of refetching the whole list.
      queryClient.setQueryData<Simulation[]>(simulationKeys.byCustomer(customerId), (current) => [
        simulation,
        ...(current ?? []),
      ]);
    },
  });
}

/**
 * Front and back share computeQuote, so they must agree. A mismatch would reveal a deployment skew
 * (e.g. old frontend bundle vs new pricing on the server) and is surfaced to the user.
 */
export function serverAgreesWithClient(simulation: Simulation, plan: PlanId, countryCode: CountryCode): boolean {
  const expected = computeQuote({
    activeUsers: simulation.activeUsers,
    storageGb: simulation.storageGb,
    apiCalls: simulation.apiCalls,
    plan,
    countryCode,
  });
  return expected.totalCents === simulation.quote.totalCents;
}
