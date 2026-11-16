import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EXCHANGE_RATES_URL } from '../../api/exchangeRates';
import {
  aPage,
  aCustomer,
  aSimulation,
  mockFetch,
  ratesResponse,
  renderRoute,
  type MockResponse,
} from '../../test/utils';
import { readRatesCache, writeRatesCache } from './ratesCache';
import { RATES_STALE_MS } from './useExchangeRates';

type ExchangeMock = Parameters<typeof mockFetch>[1];

// Default customer: plan "pro", Spain. Simulator default: 10 users → 121,00 € (12100 cents).
function mockApi(exchange?: ExchangeMock) {
  return mockFetch(
    ({ url }): MockResponse =>
      url.endsWith('/simulations')
        ? { body: aPage([aSimulation({ id: 3, activeUsers: 15 })]) } // 169,40 €
        : { body: aCustomer() },
    exchange,
  );
}

const projectedTotal = () => screen.getByTestId('projected-total').textContent?.replace(/\s+/g, ' ');
const currencySelect = () => screen.getByLabelText('Divisa');
const history = () => screen.getByRole('region', { name: /Historial de simulaciones/ });
const exchangeCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => url === EXCHANGE_RATES_URL).length;

async function openCustomer() {
  const view = renderRoute('/customers/1');
  await screen.findByRole('heading', { name: 'Simulador de factura' });
  return view;
}

describe('display currency', () => {
  it('converts every amount on screen and remembers the choice', async () => {
    mockApi();
    const { user } = await openCustomer();
    await screen.findByRole('option', { name: 'USD' });

    await user.selectOptions(currencySelect(), 'USD');

    expect(projectedTotal()).toBe('133,10 US$');
    expect(within(history()).getByText('186,34 US$')).toBeInTheDocument();
    expect(screen.getByTestId('eur-equivalent')).toHaveTextContent('Se factura en EUR: 121,00 € · 1 EUR = 1,1 USD');
    expect(window.localStorage.getItem('saas-o-matic:currency')).toBe('USD');
  });

  it('restores the persisted currency on load', async () => {
    window.localStorage.setItem('saas-o-matic:currency', 'GBP');
    mockApi();
    await openCustomer();

    await waitFor(() => expect(projectedTotal()).toMatch(/^102,85/));
    expect(currencySelect()).toHaveValue('GBP');
  });

  it('shows EUR with a disabled selector while the rates load', async () => {
    mockApi({ exchangeRates: 'pending' });
    await openCustomer();

    expect(currencySelect()).toBeDisabled();
    expect(screen.getByText('Cargando tipos…')).toBeInTheDocument();
    expect(projectedTotal()).toBe('121,00 €');
  });

  it('falls back to EUR with a non-blocking banner and recovers on retry', async () => {
    let providerUp = false;
    mockApi({ exchangeRates: () => (providerUp ? { body: ratesResponse() } : { status: 503, body: {} }) });
    const { user } = await openCustomer();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los tipos de cambio');
    expect(currencySelect()).toBeDisabled();
    expect(projectedTotal()).toBe('121,00 €');

    providerUp = true;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'USD' })).toBeInTheDocument();
  });

  it('never labels EUR amounts with another currency when its rate is unavailable', async () => {
    // Found by mutation testing: a persisted USD + provider down (no cache) must render EUR, not "121,00 US$".
    window.localStorage.setItem('saas-o-matic:currency', 'USD');
    mockApi({ exchangeRates: { status: 503, body: {} } });
    await openCustomer();

    await screen.findByRole('alert');
    expect(projectedTotal()).toBe('121,00 €');
    expect(currencySelect()).toHaveValue('EUR');
  });

  it('treats a malformed provider response as an error', async () => {
    mockApi({ exchangeRates: { body: { result: 'error', 'error-type': 'quota-reached' } } });
    await openCustomer();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los tipos de cambio');
  });

  it('keeps using cached rates when the provider is down, and says so', async () => {
    writeRatesCache(
      { rates: { EUR: 1, USD: 1.2 }, updatedAt: 1794787351000, nextUpdateAt: 1794874701000 },
      Date.now() - 2 * RATES_STALE_MS,
    );
    window.localStorage.setItem('saas-o-matic:currency', 'USD');
    mockApi({ exchangeRates: { status: 503, body: {} } });
    await openCustomer();

    expect(await screen.findByText(/No se pudieron actualizar los tipos de cambio/)).toBeInTheDocument();
    expect(projectedTotal()).toBe('145,20 US$');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not call the provider while cached rates are fresh', async () => {
    writeRatesCache({ rates: { EUR: 1, USD: 1.1 }, updatedAt: 1794787351000, nextUpdateAt: 1794874701000 }, Date.now());
    mockApi();
    await openCustomer();

    expect(screen.getByRole('option', { name: 'USD' })).toBeInTheDocument();
    expect(exchangeCalls()).toBe(0);
  });

  it('shows publication and next update times in the viewer time zone, plus the required attribution', async () => {
    mockApi();
    await openCustomer();

    // Provider publishes at 00:02 UTC → 1:02 in Madrid (TZ pinned in vite.config). Not the fetch time.
    const footer = await screen.findByText(/Tipos publicados el/);
    expect(footer).toHaveTextContent(
      'Tipos publicados el 16 nov 2026, 1:02 (CET) · próxima actualización: 17 nov, 1:18',
    );
    // Fresh rates are persisted for the next visit (and for provider outages).
    expect(readRatesCache()?.data.rates.USD).toBe(1.1);
    expect(screen.getByRole('link', { name: 'Rates By Exchange Rate API' })).toHaveAttribute(
      'href',
      'https://www.exchangerate-api.com',
    );
  });
});
