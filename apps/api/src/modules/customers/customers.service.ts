import type { Customer, NewCustomer, SearchCustomersQuery } from '@saas/shared';
import { NotFoundError } from '../../errors';
import type { CustomersRepository } from './customers.repository';

export function createCustomersService(customers: CustomersRepository) {
  return {
    create(input: NewCustomer): Customer {
      return customers.insert(input);
    },

    getById(id: number): Customer {
      const customer = customers.findById(id);
      if (!customer) throw new NotFoundError(`Customer ${id} not found`);
      return customer;
    },

    search(query: SearchCustomersQuery): Customer[] {
      return customers.search(query);
    },
  };
}

export type CustomersService = ReturnType<typeof createCustomersService>;
