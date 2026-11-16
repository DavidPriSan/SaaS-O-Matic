import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCustomer, customerKeys, fetchCustomer, fetchCustomers } from '../../api/customers';

export function useCustomerSearch(term: string) {
  return useQuery({
    queryKey: customerKeys.search(term),
    queryFn: ({ signal }) => fetchCustomers(term, signal),
    // Keep showing the previous results while the next search is in flight (no flicker).
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: ({ signal }) => fetchCustomer(id, signal),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      queryClient.setQueryData(customerKeys.detail(customer.id), customer);
      void queryClient.invalidateQueries({ queryKey: customerKeys.searches() });
    },
  });
}
