import { COUNTRIES, OVERAGE, PLANS, PRICING_VERSION, USER_TIERS } from '@saas/shared';
import type { FastifyInstance } from 'fastify';

export function registerMetaRoutes(app: FastifyInstance): void {
  app.get('/health', (_request, reply) => reply.send({ status: 'ok' }));

  app.get('/meta/pricing', (_request, reply) =>
    reply.send({
      pricingVersion: PRICING_VERSION,
      tiers: USER_TIERS,
      plans: Object.values(PLANS),
      overage: OVERAGE,
      countries: Object.values(COUNTRIES),
    }),
  );
}
