import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchExchangeRates } from '../../api/exchangeRates';
import { readRatesCache, writeRatesCache } from './ratesCache';

/** The provider updates once a day and sends `Cache-Control: max-age=3600`. */
export const RATES_STALE_MS = 60 * 60 * 1000;
const RATES_GC_MS = 24 * 60 * 60 * 1000;

/**
 * Exchange rates with a persisted cache: the last good rates render instantly on reload and keep the
 * app usable if the provider is down. Retries come from the QueryClient defaults.
 */
export function useExchangeRates() {
  const [cached] = useState(readRatesCache);

  return useQuery({
    queryKey: ['exchange-rates', 'EUR'],
    queryFn: async ({ signal }) => {
      const rates = await fetchExchangeRates(signal);
      writeRatesCache(rates);
      return rates;
    },
    staleTime: RATES_STALE_MS,
    gcTime: RATES_GC_MS,
    refetchOnWindowFocus: false,
    ...(cached ? { initialData: cached.data, initialDataUpdatedAt: cached.savedAt } : {}),
  });
}
