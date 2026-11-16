import {
  computeQuote,
  type CreateSimulationInput,
  type Customer,
  type Page,
  type PageQuery,
  type Simulation,
} from '@saas/shared';
import { NotFoundError } from '../../errors';
import type { CustomersRepository } from '../customers/customers.repository';
import type { SimulationsRepository } from './simulations.repository';

interface Deps {
  customers: CustomersRepository;
  simulations: SimulationsRepository;
}

export function createSimulationsService({ customers, simulations }: Deps) {
  function requireCustomer(id: number): Customer {
    const customer = customers.findById(id);
    if (!customer) throw new NotFoundError(`Customer ${id} not found`);
    return customer;
  }

  return {
    /** The server is the pricing authority: plan and country come from the stored customer. */
    create(input: CreateSimulationInput): Simulation {
      const { plan, countryCode } = requireCustomer(input.customerId);
      const quote = computeQuote({
        activeUsers: input.activeUsers,
        storageGb: input.storageGb,
        apiCalls: input.apiCalls,
        plan,
        countryCode,
      });
      return simulations.insert({ ...input, plan, countryCode, quote });
    },

    listByCustomer(customerId: number, page: PageQuery): Page<Simulation> {
      requireCustomer(customerId);
      return simulations.listByCustomer(customerId, page);
    },
  };
}

export type SimulationsService = ReturnType<typeof createSimulationsService>;
