import { QueryClient } from '@tanstack/react-query';
import { isClientError } from './errors';

const MAX_RETRIES = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retrying a 4xx (404, 400) can never succeed; only transient failures are retried.
        retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
        refetchOnWindowFocus: false,
      },
    },
  });
}
