import { customerListResponseSchema, customerSchema, type CreateCustomerInput, type Customer } from '@saas/shared';
import { apiRequest } from './http';

export const customerKeys = {
  all: ['customers'] as const,
  searches: () => [...customerKeys.all, 'search'] as const,
  search: (term: string) => [...customerKeys.searches(), term] as const,
  detail: (id: number) => [...customerKeys.all, 'detail', id] as const,
};

export async function fetchCustomers(term: string, signal?: AbortSignal): Promise<Customer[]> {
  const query = term === '' ? '' : `?${new URLSearchParams({ q: term })}`;
  const { items } = await apiRequest(`/customers${query}`, { schema: customerListResponseSchema, signal });
  return items;
}

export function fetchCustomer(id: number, signal?: AbortSignal): Promise<Customer> {
  return apiRequest(`/customers/${id}`, { schema: customerSchema, signal });
}

/** Sends the raw user input: normalization and validation authority live in the API. */
export function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return apiRequest('/customers', { method: 'POST', body: input, schema: customerSchema });
}
