import { createCustomerSchema, idParamSchema, searchCustomersQuerySchema } from '@saas/shared';
import type { FastifyInstance } from 'fastify';
import type { CustomersService } from './customers.service';

/**
 * HTTP only: parse with Zod (errors go to the global handler), delegate, pick status code.
 * Handlers are synchronous (better-sqlite3 is sync); Fastify forwards thrown errors to the error handler.
 */
export function registerCustomerRoutes(app: FastifyInstance, service: CustomersService): void {
  app.post('/customers', (request, reply) => {
    const input = createCustomerSchema.parse(request.body);
    return reply.code(201).send(service.create(input));
  });

  app.get('/customers', (request, reply) => {
    const query = searchCustomersQuerySchema.parse(request.query);
    return reply.send(service.search(query));
  });

  app.get('/customers/:id', (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    return reply.send(service.getById(id));
  });
}
