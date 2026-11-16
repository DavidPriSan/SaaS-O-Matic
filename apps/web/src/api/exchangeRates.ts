import { DISPLAY_CURRENCIES, type DisplayCurrency } from '@saas/shared';
import { z } from 'zod';

export const EXCHANGE_RATES_URL = 'https://open.er-api.com/v6/latest/EUR';

export type DisplayRates = Partial<Record<DisplayCurrency, number>>;

export interface ExchangeRates {
  rates: DisplayRates;
  /** When the provider published these rates, epoch ms. */
  updatedAt: number;
  /** When the provider will publish the next ones (daily), epoch ms. */
  nextUpdateAt: number;
}

export class ExchangeRatesError extends Error {
  override name = 'ExchangeRatesError';
}

/** External input: validated like any other (CLAUDE.md). A malformed payload is an error, not data. */
const responseSchema = z.object({
  result: z.literal('success'),
  base_code: z.literal('EUR'),
  time_last_update_unix: z.number().int().positive(),
  time_next_update_unix: z.number().int().positive(),
  rates: z.record(z.string(), z.number().positive()),
});

export async function fetchExchangeRates(signal?: AbortSignal): Promise<ExchangeRates> {
  let response: Response;
  try {
    response = await fetch(EXCHANGE_RATES_URL, { signal: signal ?? null });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ExchangeRatesError('Network request failed');
  }
  if (!response.ok) throw new ExchangeRatesError(`HTTP ${response.status}`);

  const parsed = responseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new ExchangeRatesError('Unexpected response shape');

  const { rates, time_last_update_unix, time_next_update_unix } = parsed.data;
  return {
    rates: pickDisplayRates(rates),
    updatedAt: time_last_update_unix * 1000,
    nextUpdateAt: time_next_update_unix * 1000,
  };
}

/** Keep only the currencies offered in the UI (166 come back); EUR is always 1. */
function pickDisplayRates(all: Record<string, number>): DisplayRates {
  const rates: DisplayRates = { EUR: 1 };
  for (const currency of DISPLAY_CURRENCIES) {
    const rate = all[currency];
    if (rate !== undefined) rates[currency] = rate;
  }
  return rates;
}
