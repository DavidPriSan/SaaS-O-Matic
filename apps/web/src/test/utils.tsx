import { computeQuote, type Customer, type Simulation } from '@saas/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { routes } from '../app/routes';

export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
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

/** Replaces global fetch; the handler decides each response. Returns the recorded requests. */
export function mockFetch(handler: (request: RecordedRequest) => MockResponse): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request: RecordedRequest = {
        url: input instanceof Request ? input.url : input.toString(),
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      requests.push(request);
      const { status = 200, body } = handler(request);
      return Promise.resolve(
        new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
      );
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
