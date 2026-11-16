import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { Db } from './db/connection';
import { createCustomersRepository } from './modules/customers/customers.repository';
import { registerCustomerRoutes } from './modules/customers/customers.routes';
import { createCustomersService } from './modules/customers/customers.service';
import { registerMetaRoutes } from './modules/meta/meta.routes';
import { createSimulationsRepository } from './modules/simulations/simulations.repository';
import { registerSimulationRoutes } from './modules/simulations/simulations.routes';
import { createSimulationsService } from './modules/simulations/simulations.service';
import { registerErrorHandler } from './plugins/error-handler';

export interface AppOptions {
  db: Db;
  corsOrigin: string;
  logger?: FastifyServerOptions['logger'];
}

const BODY_LIMIT_BYTES = 16 * 1024;

/** App factory with injected dependencies: the server and the tests build it the same way. */
export async function buildApp({ db, corsOrigin, logger = false }: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger, bodyLimit: BODY_LIMIT_BYTES });

  await app.register(cors, { origin: corsOrigin });
  registerErrorHandler(app);

  const customers = createCustomersRepository(db);
  const simulations = createSimulationsRepository(db);

  registerMetaRoutes(app);
  registerCustomerRoutes(app, createCustomersService(customers));
  registerSimulationRoutes(app, createSimulationsService({ customers, simulations }));

  return app;
}
