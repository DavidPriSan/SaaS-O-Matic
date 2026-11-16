import type { CreateCustomerInput } from '@saas/shared';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { openDatabase, type Db } from '../db/connection';
import { runMigrations } from '../db/migrate';

export const TEST_CORS_ORIGIN = 'http://localhost:5173';

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  close: () => Promise<void>;
}

/** Fresh in-memory database per test: full isolation, real SQL, no ports opened. */
export async function createTestApp(): Promise<TestContext> {
  const db = openDatabase(':memory:');
  runMigrations(db);
  const app = await buildApp({ db, corsOrigin: TEST_CORS_ORIGIN });
  return {
    app,
    db,
    close: async () => {
      await app.close();
      db.close();
    },
  };
}

export const validCustomer = (overrides: Partial<CreateCustomerInput> = {}): CreateCustomerInput => ({
  companyName: 'Acme Ibérica S.L.',
  taxId: 'B12345674',
  email: 'it@acme.es',
  countryCode: 'ES',
  plan: 'pro',
  ...overrides,
});
