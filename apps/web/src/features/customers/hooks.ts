import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCustomer, customerKeys, fetchCustomer, fetchCustomers } from '../../api/customers';
import { FIRST_PAGE, flattenPages, nextPageParam } from '../../lib/pagination';

export function useCustomerSearch(term: string) {
  return useInfiniteQuery({
    queryKey: customerKeys.search(term),
    queryFn: ({ signal, pageParam }) => fetchCustomers(term, pageParam, signal),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPageParam,
    select: flattenPages,
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
