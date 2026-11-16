import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aCustomer, errorBody, mockFetch, renderRoute } from '../../test/utils';

const customers = [
  aCustomer({ id: 1, companyName: 'Acme Ibérica S.L.' }),
  aCustomer({ id: 2, companyName: 'Nébula Analytics', taxId: 'A58818501' }),
];

describe('SearchPage', () => {
  it('lists the latest customers as cards linking to their detail', async () => {
    mockFetch(() => ({ body: { items: customers } }));
    renderRoute('/');

    const link = await screen.findByRole('link', { name: /Nébula Analytics/ });
    expect(link).toHaveAttribute('href', '/customers/2');
    expect(screen.getByText('Últimos 2 clientes registrados')).toBeInTheDocument();
  });

  it('searches the API with the debounced term and keeps it in the URL', async () => {
    const requests = mockFetch(({ url }) => ({
      body: { items: url.includes('q=') ? [customers[1]] : customers },
    }));
    const { user, router } = renderRoute('/');
    await screen.findByText('Acme Ibérica S.L.');

    await user.type(screen.getByRole('searchbox'), 'nebula');

    expect(await screen.findByText('1 resultado(s)')).toBeInTheDocument();
    expect(screen.queryByText('Acme Ibérica S.L.')).not.toBeInTheDocument();
    expect(requests.at(-1)?.url).toBe('/api/customers?q=nebula');
    expect(requests).toHaveLength(2); // debounced: one request for the whole word, not one per key
    expect(router.state.location.search).toBe('?q=nebula');
  });

  it('shows a specific empty state when nothing matches', async () => {
    mockFetch(() => ({ body: { items: [] } }));
    renderRoute('/?q=zzz');

    expect(await screen.findByText('Sin resultados para «zzz»')).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    let calls = 0;
    mockFetch(() => (++calls === 1 ? { status: 500, body: errorBody('INTERNAL_ERROR') } : { body: { items: customers } }));
    const { user } = renderRoute('/');

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Acme Ibérica S.L.')).toBeInTheDocument();
  });
});
