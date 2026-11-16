import { createCustomerSchema, idParamSchema, searchCustomersQuerySchema } from '@saas/shared';
import type { FastifyInstance } from 'fastify';
import type { CustomersService } from './customers.service';

/** HTTP only: parse with Zod (errors go to the global handler), delegate, pick status code. */
export function registerCustomerRoutes(app: FastifyInstance, service: CustomersService): void {
  app.post('/customers', async (request, reply) => {
    const input = createCustomerSchema.parse(request.body);
    return reply.code(201).send(service.create(input));
  });

  app.get('/customers', async (request) => {
    const query = searchCustomersQuerySchema.parse(request.query);
    return { items: service.search(query) };
  });

  app.get('/customers/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return service.getById(id);
  });
}
