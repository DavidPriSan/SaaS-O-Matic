import { describe, expect, it } from 'vitest';
import { readRatesCache, writeRatesCache } from './ratesCache';

const KEY = 'saas-o-matic:exchange-rates:v1';

describe('ratesCache', () => {
  it('round-trips the last good rates with their save time', () => {
    writeRatesCache({ rates: { EUR: 1, USD: 1.1 }, updatedAt: 1000 }, 2000);

    expect(readRatesCache()).toEqual({ data: { rates: { EUR: 1, USD: 1.1 }, updatedAt: 1000 }, savedAt: 2000 });
  });

  it.each([
    ['missing', null],
    ['corrupted JSON', '{not json'],
    ['an unexpected shape', JSON.stringify({ rates: 'nope' })],
    ['an unknown currency', JSON.stringify({ savedAt: 1, updatedAt: 1, rates: { XXX: 2 } })],
  ])('ignores %s storage content', (_label, raw) => {
    if (raw !== null) window.localStorage.setItem(KEY, raw);
    expect(readRatesCache()).toBeUndefined();
  });
});
