import {
  computeQuote,
  type CountryCode,
  type CreateSimulationInput,
  type Page,
  type PlanId,
  type Simulation,
} from '@saas/shared';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { createSimulation, fetchSimulations, simulationKeys } from '../../api/simulations';
import { FIRST_PAGE, flattenPages, nextPageParam } from '../../lib/pagination';

type HistoryCache = InfiniteData<Page<Simulation>, string | null>;

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
  return useInfiniteQuery({
    queryKey: simulationKeys.byCustomer(customerId),
    queryFn: ({ signal, pageParam }) => fetchSimulations(customerId, pageParam, signal),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPageParam,
    select: flattenPages,
  });
}

export function useCreateSimulation(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSimulation,
    onSuccess: (simulation) => {
      const key = simulationKeys.byCustomer(customerId);
      const cached = queryClient.getQueryData<HistoryCache>(key);
      if (cached) {
        // The server returns the persisted row: prepend it instead of refetching every loaded page. Cursors stay
        // valid because they point at the last item of each page, not at the first.
        queryClient.setQueryData<HistoryCache>(key, prependToFirstPage(cached, simulation));
      } else {
        // No list loaded (still pending or failed): seeding [simulation] would hide the error and the older
        // history. Reload from the server instead.
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

function prependToFirstPage(cache: HistoryCache, simulation: Simulation): HistoryCache {
  const [first, ...rest] = cache.pages;
  const firstPage = first ?? { items: [], nextCursor: null };
  return { ...cache, pages: [{ ...firstPage, items: [simulation, ...firstPage.items] }, ...rest] };
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
