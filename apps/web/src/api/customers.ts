import {
  customerListResponseSchema,
  customerSchema,
  type CreateCustomerInput,
  type Customer,
  type Page,
} from '@saas/shared';
import { apiRequest } from './http';

export const customerKeys = {
  all: ['customers'] as const,
  searches: () => [...customerKeys.all, 'search'] as const,
  search: (term: string) => [...customerKeys.searches(), term] as const,
  detail: (id: number) => [...customerKeys.all, 'detail', id] as const,
};

export function fetchCustomers(term: string, cursor: string | null, signal?: AbortSignal): Promise<Page<Customer>> {
  const params = new URLSearchParams();
  if (term !== '') params.set('q', term);
  if (cursor !== null) params.set('cursor', cursor);
  const query = params.toString() === '' ? '' : `?${params}`;
  return apiRequest(`/customers${query}`, { schema: customerListResponseSchema, signal });
}

export function fetchCustomer(id: number, signal?: AbortSignal): Promise<Customer> {
  return apiRequest(`/customers/${id}`, { schema: customerSchema, signal });
}

/** Sends the raw user input: normalization and validation authority live in the API. */
export function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return apiRequest('/customers', { method: 'POST', body: input, schema: customerSchema });
}
