import type { Page } from '@playwright/test';

// The exchange-rate provider is external: a fixed payload keeps the run deterministic and offline-safe.
const RATES = {
  result: 'success',
  base_code: 'EUR',
  time_last_update_unix: 1_763_251_200,
  time_next_update_unix: 1_763_337_600,
  rates: { EUR: 1, USD: 1.1, GBP: 0.85, CHF: 0.93, MXN: 20, JPY: 170 },
};

export async function mockExchangeRates(page: Page): Promise<void> {
  await page.route('https://open.er-api.com/**', (route) => route.fulfill({ json: RATES }));
}
