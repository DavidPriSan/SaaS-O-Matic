import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aCustomer, errorBody, mockFetch, renderRoute } from '../../test/utils';

describe('CustomerDetailPage', () => {
  it('shows the customer data card', async () => {
    mockFetch(({ url }) =>
      url.endsWith('/simulations')
        ? { body: { items: [] } }
        : { body: aCustomer({ plan: 'enterprise', countryCode: 'DE' }) },
    );
    renderRoute('/customers/1');

    expect(await screen.findByRole('heading', { name: 'Acme Ibérica S.L.' })).toBeInTheDocument();
    expect(screen.getByText('Plan Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Alemania · IVA 19 %')).toBeInTheDocument();
    expect(screen.getByText('1.000 GB · 10.000.000 llamadas API/mes')).toBeInTheDocument();
  });

  it('shows "not found" for a 404 without retrying', async () => {
    const requests = mockFetch(() => ({ status: 404, body: errorBody('NOT_FOUND') }));
    renderRoute('/customers/999');

    expect(await screen.findByText('Cliente no encontrado')).toBeInTheDocument();
    expect(requests).toHaveLength(1);
  });

  it('does not call the API for a malformed id', async () => {
    const requests = mockFetch(() => ({ body: aCustomer() }));
    renderRoute('/customers/abc');

    expect(await screen.findByText('Cliente no encontrado')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});
