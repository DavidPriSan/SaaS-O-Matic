import { createCustomerSchema, createSimulationSchema, type CreateCustomerInput } from '@saas/shared';
import { loadConfig } from '../config';
import { createCustomersRepository } from '../modules/customers/customers.repository';
import { createCustomersService } from '../modules/customers/customers.service';
import { createSimulationsRepository } from '../modules/simulations/simulations.repository';
import { createSimulationsService } from '../modules/simulations/simulations.service';
import { openDatabase } from './connection';
import { runMigrations } from './migrate';

type Usage = [activeUsers: number, storageGb: number, apiCalls: number];

/** Fictitious companies with algorithmically valid tax IDs. */
const SAMPLE_DATA: Array<{ customer: CreateCustomerInput; usage: Usage[] }> = [
  {
    customer: {
      companyName: 'Acme Ibérica S.L.',
      taxId: 'B12345674',
      email: 'it@acme-iberica.es',
      countryCode: 'ES',
      plan: 'pro',
    },
    usage: [
      [15, 300, 1_250_500],
      [40, 200, 800_000],
    ],
  },
  {
    customer: {
      companyName: 'Nébula Analytics S.A.',
      taxId: 'A58818501',
      email: 'compras@nebula.es',
      countryCode: 'ES',
      plan: 'enterprise',
    },
    usage: [
      [120, 900, 9_000_000],
      [250, 1500, 14_500_000],
    ],
  },
  {
    customer: {
      companyName: 'Laura Gómez Consulting',
      taxId: '12345678Z',
      email: 'laura@lgconsulting.es',
      countryCode: 'ES',
      plan: 'basic',
    },
    usage: [[3, 10, 20_000]],
  },
  {
    customer: {
      companyName: 'Kowalski Digital',
      taxId: 'X1234567L',
      email: 'hello@kowalski.dev',
      countryCode: 'ES',
      plan: 'basic',
    },
    usage: [],
  },
  {
    customer: {
      companyName: 'Bayern Cloud GmbH',
      taxId: 'DE123456789',
      email: 'einkauf@bayern-cloud.de',
      countryCode: 'DE',
      plan: 'enterprise',
    },
    usage: [[60, 1200, 12_000_000]],
  },
  {
    customer: {
      companyName: 'Austin Data Inc.',
      taxId: '12-3456789',
      email: 'billing@austindata.com',
      countryCode: 'US',
      plan: 'pro',
    },
    usage: [[11, 250, 1_000_000]],
  },
];

const config = loadConfig();
const db = openDatabase(config.DB_PATH);
runMigrations(db);

const customersRepository = createCustomersRepository(db);
const customersService = createCustomersService(customersRepository);
const simulationsService = createSimulationsService({
  customers: customersRepository,
  simulations: createSimulationsRepository(db),
});

if (customersService.search({ limit: 1 }).items.length > 0) {
  console.info('Seed skipped: the database already contains customers.');
} else {
  // Going through schemas + services keeps seed data subject to the same rules as the API.
  db.transaction(() => {
    for (const { customer, usage } of SAMPLE_DATA) {
      const created = customersService.create(createCustomerSchema.parse(customer));
      for (const [activeUsers, storageGb, apiCalls] of usage) {
        simulationsService.create(
          createSimulationSchema.parse({ customerId: created.id, activeUsers, storageGb, apiCalls }),
        );
      }
    }
  })();
  console.info(`Seed completed: ${SAMPLE_DATA.length} customers inserted into ${config.DB_PATH}`);
}

db.close();
