import { describe, expect, it } from 'vitest';
import { readRatesCache, writeRatesCache } from './ratesCache';

const KEY = 'saas-o-matic:exchange-rates:v2';
const DATA = { rates: { EUR: 1, USD: 1.1 }, updatedAt: 1000, nextUpdateAt: 5000 };

describe('ratesCache', () => {
  it('round-trips the last good rates with their save time', () => {
    writeRatesCache(DATA, 2000);

    expect(readRatesCache()).toEqual({ data: DATA, savedAt: 2000 });
  });

  it.each([
    ['missing', null],
    ['corrupted JSON', '{not json'],
    ['an unexpected shape', JSON.stringify({ rates: 'nope' })],
    ['an entry without nextUpdateAt (older format)', JSON.stringify({ savedAt: 1, updatedAt: 1, rates: { USD: 1 } })],
    ['an unknown currency', JSON.stringify({ savedAt: 1, updatedAt: 1, nextUpdateAt: 2, rates: { XXX: 2 } })],
  ])('ignores %s storage content', (_label, raw) => {
    if (raw !== null) window.localStorage.setItem(KEY, raw);
    expect(readRatesCache()).toBeUndefined();
  });
});
