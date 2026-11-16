import { DISPLAY_CURRENCIES } from '@saas/shared';
import { z } from 'zod';
import type { ExchangeRates } from '../../api/exchangeRates';
import { readStorage, writeStorage } from '../../lib/storage';

const CACHE_KEY = 'saas-o-matic:exchange-rates:v1';

/** Validated on read: storage may hold corrupted JSON or the shape of an older app version. */
const cacheSchema = z.object({
  savedAt: z.number(),
  updatedAt: z.number(),
  rates: z.partialRecord(z.enum(DISPLAY_CURRENCIES), z.number().positive()),
});

export interface CachedRates {
  data: ExchangeRates;
  savedAt: number;
}

export function readRatesCache(): CachedRates | undefined {
  const raw = readStorage(CACHE_KEY);
  if (raw === null) return undefined;
  try {
    const { savedAt, updatedAt, rates } = cacheSchema.parse(JSON.parse(raw));
    return { data: { rates, updatedAt }, savedAt };
  } catch {
    return undefined;
  }
}

export function writeRatesCache(data: ExchangeRates, savedAt: number = Date.now()): void {
  writeStorage(CACHE_KEY, JSON.stringify({ savedAt, updatedAt: data.updatedAt, rates: data.rates }));
}
