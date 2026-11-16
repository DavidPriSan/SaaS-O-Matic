import { createSimulationSchema, idParamSchema } from '@saas/shared';
import type { FastifyInstance } from 'fastify';
import type { SimulationsService } from './simulations.service';

export function registerSimulationRoutes(app: FastifyInstance, service: SimulationsService): void {
  app.post('/simulations', (request, reply) => {
    const input = createSimulationSchema.parse(request.body);
    return reply.code(201).send(service.create(input));
  });

  app.get('/customers/:id/simulations', (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    return reply.send({ items: service.listByCustomer(id) });
  });
}
