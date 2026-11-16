import { computeQuote, type Customer, type Simulation } from '@saas/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { EXCHANGE_RATES_URL } from '../api/exchangeRates';
import { routes } from '../app/routes';
import { CurrencyProvider } from '../features/currency/CurrencyContext';

export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <RouterProvider router={router} />
      </CurrencyProvider>
    </QueryClientProvider>,
  );
  return { router, user, ...view };
}

export interface MockResponse {
  status?: number;
  body?: unknown;
}

export interface RecordedRequest {
  url: string;
  method: string;
  body: unknown;
}

/** Shape of a real open.er-api.com response (trimmed). Round rates keep expected values readable. */
export const ratesResponse = (rates: Record<string, number> = { EUR: 1, USD: 1.1, GBP: 0.85, JPY: 176 }) => ({
  result: 'success',
  base_code: 'EUR',
  time_last_update_unix: 1794787351, // 2026-11-16 00:02:31 UTC
  time_next_update_unix: 1794874701, // 2026-11-17 00:18:21 UTC
  rates,
});

/** 'pending' never resolves (loading state). A function is evaluated on every request (retry scenarios). */
type ExchangeMock = MockResponse | 'pending' | (() => MockResponse);

interface MockFetchOptions {
  exchangeRates?: ExchangeMock;
}

const jsonResponse = ({ status = 200, body }: MockResponse) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

function respondExchange(mock: ExchangeMock): Promise<Response> {
  if (mock === 'pending') return new Promise<Response>(() => undefined);
  return jsonResponse(typeof mock === 'function' ? mock() : mock);
}

/**
 * Replaces global fetch. App API requests go to `handler` and are recorded (returned array);
 * the exchange-rate provider is answered separately so request counts only reflect our API.
 */
export function mockFetch(
  handler: (request: RecordedRequest) => MockResponse,
  { exchangeRates = { body: ratesResponse() } }: MockFetchOptions = {},
): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url === EXCHANGE_RATES_URL) return respondExchange(exchangeRates);
      const request: RecordedRequest = {
        url,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      requests.push(request);
      return jsonResponse(handler(request));
    }),
  );
  return requests;
}

export const errorBody = (code: string, details?: Array<{ path: string; message: string }>) => ({
  error: { code, message: 'test', ...(details ? { details } : {}) },
});

export const aCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 1,
  companyName: 'Acme Ibérica S.L.',
  taxId: 'B12345674',
  taxIdType: 'CIF',
  email: 'it@acme.es',
  countryCode: 'ES',
  plan: 'pro',
  createdAt: '2026-11-16T09:00:00.000Z',
  ...overrides,
});

interface SimulationFixture {
  id?: number;
  activeUsers?: number;
  storageGb?: number;
  apiCalls?: number;
}

/** A realistic persisted simulation for the default customer (quote computed with the real pricing). */
export function aSimulation({
  id = 1,
  activeUsers = 10,
  storageGb = 0,
  apiCalls = 0,
}: SimulationFixture = {}): Simulation {
  const { id: customerId, plan, countryCode } = aCustomer();
  return {
    id,
    customerId,
    activeUsers,
    storageGb,
    apiCalls,
    plan,
    countryCode,
    quote: computeQuote({ activeUsers, storageGb, apiCalls, plan, countryCode }),
    createdAt: '2026-11-16T10:00:00.000Z',
  };
}
