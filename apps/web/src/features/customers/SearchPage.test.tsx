import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aPage, aCustomer, errorBody, mockFetch, renderRoute } from '../../test/utils';

const customers = [
  aCustomer({ id: 1, companyName: 'Acme Ibérica S.L.' }),
  aCustomer({ id: 2, companyName: 'Nébula Analytics', taxId: 'A58818501' }),
];

describe('SearchPage', () => {
  it('lists the latest customers as cards linking to their detail', async () => {
    mockFetch(() => ({ body: aPage(customers) }));
    renderRoute('/');

    const link = await screen.findByRole('link', { name: /Nébula Analytics/ });
    expect(link).toHaveAttribute('href', '/customers/2');
    expect(screen.getByText('Últimos 2 clientes registrados')).toBeInTheDocument();
  });

  it('searches the API with the debounced term and keeps it in the URL', async () => {
    const requests = mockFetch(({ url }) => ({
      body: aPage(url.includes('q=') ? [customers[1]] : customers),
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

  it('never sends a query longer than the API accepts (audit finding)', async () => {
    const requests = mockFetch(() => ({ body: aPage([]) }));
    renderRoute(`/?q=${'x'.repeat(150)}`);

    expect(await screen.findByRole('searchbox')).toHaveAttribute('maxLength', '100');
    await screen.findByText(/Sin resultados/);
    expect(new URL(requests.at(-1)?.url ?? '', 'http://x').searchParams.get('q')).toHaveLength(100);
  });

  it('shows a specific empty state when nothing matches', async () => {
    mockFetch(() => ({ body: aPage([]) }));
    renderRoute('/?q=zzz');

    expect(await screen.findByText('Sin resultados para «zzz»')).toBeInTheDocument();
  });

  it('loads more results with «Ver más» and keeps the ones already shown (spec 05)', async () => {
    const requests = mockFetch(({ url }) => ({
      body: url.includes('cursor=')
        ? aPage([aCustomer({ id: 3, companyName: 'Zeta Cloud', taxId: '87654321X' })])
        : aPage(customers, '2026-11-16T09:00:00.000Z_2'),
    }));
    const { user } = renderRoute('/');
    await screen.findByText('Nébula Analytics');
    expect(screen.getByText('Últimos 2 clientes registrados; hay más')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver más' }));

    expect(await screen.findByText('Zeta Cloud')).toBeInTheDocument();
    expect(screen.getByText('Acme Ibérica S.L.')).toBeInTheDocument();
    expect(screen.getByText('Últimos 3 clientes registrados')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver más' })).not.toBeInTheDocument();
    expect(requests.at(-1)?.url).toBe('/api/customers?cursor=2026-11-16T09%3A00%3A00.000Z_2');
  });

  it('keeps the search term when loading the next page', async () => {
    const requests = mockFetch(({ url }) => ({
      body: url.includes('cursor=') ? aPage([]) : aPage([customers[1]], '2026-11-16T09:00:00.000Z_2'),
    }));
    const { user } = renderRoute('/?q=nebula');

    expect(await screen.findByText('Mostrando 1 resultado(s); hay más')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver más' }));

    await screen.findByText('1 resultado(s)');
    expect(requests.at(-1)?.url).toBe('/api/customers?q=nebula&cursor=2026-11-16T09%3A00%3A00.000Z_2');
  });

  it('keeps the loaded results when the next page fails, and retries it', async () => {
    let nextPageCalls = 0;
    mockFetch(({ url }) => {
      if (!url.includes('cursor=')) return { body: aPage(customers, '2026-11-16T09:00:00.000Z_2') };
      nextPageCalls += 1;
      return nextPageCalls === 1
        ? { status: 500, body: errorBody('INTERNAL_ERROR') }
        : { body: aPage([aCustomer({ id: 3, companyName: 'Zeta Cloud', taxId: '87654321X' })]) };
    });
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'Ver más' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar más resultados.');
    expect(screen.getByText('Nébula Analytics')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Zeta Cloud')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    let calls = 0;
    mockFetch(() => (++calls === 1 ? { status: 500, body: errorBody('INTERNAL_ERROR') } : { body: aPage(customers) }));
    const { user } = renderRoute('/');

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Acme Ibérica S.L.')).toBeInTheDocument();
  });
});
