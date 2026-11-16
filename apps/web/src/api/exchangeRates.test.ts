import { describe, expect, it, vi } from 'vitest';
import { mockFetch, ratesResponse } from '../test/utils';
import { ExchangeRatesError, fetchExchangeRates } from './exchangeRates';

const withRates = (body: unknown, status = 200) => mockFetch(() => ({}), { exchangeRates: { status, body } });

describe('fetchExchangeRates', () => {
  it('keeps only the display currencies (EUR = 1) and converts the timestamp to ms', async () => {
    withRates(ratesResponse({ EUR: 1, USD: 1.1, AED: 4.05, ZAR: 20.1 }));

    await expect(fetchExchangeRates()).resolves.toEqual({
      rates: { EUR: 1, USD: 1.1 },
      updatedAt: 1794787351000,
    });
  });

  it.each([
    ['an error result', { result: 'error', 'error-type': 'unsupported-code' }],
    ['another base currency', { ...ratesResponse(), base_code: 'USD' }],
    ['a non-positive rate', ratesResponse({ USD: 0 })],
    ['a non-JSON body', 'oops'],
  ])('rejects %s as ExchangeRatesError', async (_label, body) => {
    withRates(body);
    await expect(fetchExchangeRates()).rejects.toBeInstanceOf(ExchangeRatesError);
  });

  it('rejects HTTP errors and network failures as ExchangeRatesError', async () => {
    withRates({}, 503);
    await expect(fetchExchangeRates()).rejects.toBeInstanceOf(ExchangeRatesError);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(fetchExchangeRates()).rejects.toBeInstanceOf(ExchangeRatesError);
  });
});
