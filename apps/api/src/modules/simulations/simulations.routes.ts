import { createSimulationSchema, idParamSchema } from '@saas/shared';
import type { FastifyInstance } from 'fastify';
import type { SimulationsService } from './simulations.service';

export function registerSimulationRoutes(app: FastifyInstance, service: SimulationsService): void {
  app.post('/simulations', async (request, reply) => {
    const input = createSimulationSchema.parse(request.body);
    return reply.code(201).send(service.create(input));
  });

  app.get('/customers/:id/simulations', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return { items: service.listByCustomer(id) };
  });
}
