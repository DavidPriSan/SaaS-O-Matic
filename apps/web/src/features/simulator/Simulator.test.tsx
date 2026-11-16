import type { Simulation } from '@saas/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aPage, aCustomer, aSimulation, mockFetch, renderRoute, type MockResponse } from '../../test/utils';

// Default customer: plan "pro", Spain (21 % VAT).
function mockApi(history: Simulation[] = [], onPost?: (body: unknown) => MockResponse) {
  return mockFetch(({ url, method, body }) => {
    if (method === 'POST')
      return onPost ? onPost(body) : { status: 201, body: aSimulation({ id: 99, ...(body as object) }) };
    if (url.endsWith('/simulations')) return { body: aPage(history) };
    return { body: aCustomer() };
  });
}

// `\s` also matches the non-breaking spaces Intl inserts before the currency symbol.
const projectedTotal = () => screen.getByTestId('projected-total').textContent?.replace(/\s+/g, ' ');
const usersSlider = () => screen.getByRole('slider', { name: 'Usuarios activos' });
const usersInput = () => screen.getByRole('spinbutton', { name: 'Usuarios activos' });
const history = () => screen.getByRole('region', { name: /Historial de simulaciones/ });

async function openCustomer() {
  const view = renderRoute('/customers/1');
  await screen.findByRole('heading', { name: 'Simulador de factura' });
  return view;
}

describe('Simulator', () => {
  it('recalculates the projection in real time without calling the API', async () => {
    const requests = mockApi();
    await openCustomer();
    const requestsBefore = requests.length;

    fireEvent.change(usersSlider(), { target: { value: '15' } });

    // 10 × 10 € + 5 × 8 € = 140 € + 21 % VAT (spec 01, PDF example)
    expect(projectedTotal()).toBe('169,40 €');
    expect(screen.getByText('Tramo 2 · 11–50 usuarios')).toBeInTheDocument();
    expect(requests).toHaveLength(requestsBefore);
  });

  it('separates the statement user cost from the extras, flagged as an own assumption', async () => {
    mockApi();
    await openCustomer();

    fireEvent.change(usersSlider(), { target: { value: '15' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Almacenamiento' }), { target: { value: '300' } });

    // The statement only prices users: its cost (140 €) is shown on its own, before any extra.
    const userCost = screen.getByText('Coste por usuarios').closest('tr');
    expect(userCost).toHaveTextContent(/Tramos del enunciado/);
    expect(userCost).toHaveTextContent(/140,00\s€/);
    // 300 GB − 250 included = 50 GB × 0,20 € = 10 €
    const extras = screen.getByText('Extras por consumo').closest('tr');
    expect(extras).toHaveTextContent('Supuesto propio');
    expect(extras).toHaveTextContent(/10,00\s€/);
  });

  it('accepts exact values beyond the slider range and validates the typed draft', async () => {
    mockApi();
    const { user } = await openCustomer();

    await user.clear(usersInput());
    expect(screen.getByRole('alert')).toHaveTextContent('Introduce un número entero entre 1 y 100.000');

    await user.type(usersInput(), '1000');

    // 420 € (first 50) + 950 × 5 € = 5.170 € + 21 % VAT
    expect(projectedTotal()).toBe('6.255,70 €');
    expect(usersSlider()).toHaveValue('500');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('saves only the usage figures and shows the result in the history', async () => {
    const requests = mockApi();
    const { user } = await openCustomer();
    expect(await within(history()).findByText('Sin simulaciones guardadas')).toBeInTheDocument();

    fireEvent.change(usersSlider(), { target: { value: '15' } });
    await user.click(screen.getByRole('button', { name: 'Guardar simulación' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Simulación guardada');
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
      customerId: 1,
      activeUsers: 15,
      storageGb: 0,
      apiCalls: 0,
    });
    expect(within(history()).getByText('169,40 €')).toBeInTheDocument();
  });

  it('warns if the server total differs from the client projection', async () => {
    mockApi([], () => {
      const tampered = aSimulation({ id: 5 });
      return { status: 201, body: { ...tampered, quote: { ...tampered.quote, totalCents: 1 } } };
    });
    const { user } = await openCustomer();

    await user.click(screen.getByRole('button', { name: 'Guardar simulación' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('el servidor calculó un importe distinto');
  });

  it('reports a failed save without losing the current inputs', async () => {
    mockApi([], () => ({ status: 502, body: 'Bad gateway' }));
    const { user } = await openCustomer();
    fireEvent.change(usersSlider(), { target: { value: '42' } });

    await user.click(screen.getByRole('button', { name: 'Guardar simulación' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
    expect(usersInput()).toHaveValue(42);
  });

  it('does not hide a failed history load behind a just-saved simulation (audit finding)', async () => {
    let historyCalls = 0;
    mockFetch(({ url, method, body }) => {
      if (method === 'POST') return { status: 201, body: aSimulation({ id: 99, ...(body as object) }) };
      if (url.endsWith('/simulations')) {
        historyCalls += 1;
        return historyCalls === 1 ? { status: 503, body: {} } : { body: aPage([aSimulation({ id: 1 })]) };
      }
      return { body: aCustomer() };
    });
    const { user } = await openCustomer();
    await within(history()).findByRole('button', { name: 'Reintentar' });

    await user.click(screen.getByRole('button', { name: 'Guardar simulación' }));

    // The history is reloaded from the server instead of being replaced by [newSimulation].
    await waitFor(() => expect(historyCalls).toBe(2));
  });

  it('loads older simulations with «Ver más» below the ones already shown', async () => {
    mockFetch(({ url }) => {
      if (url.includes('/simulations?cursor=')) return { body: aPage([aSimulation({ id: 1, activeUsers: 5 })]) };
      if (url.endsWith('/simulations')) {
        return { body: aPage([aSimulation({ id: 2, activeUsers: 15 })], '2026-11-16T10:00:00.000Z_2') };
      }
      return { body: aCustomer() };
    });
    const { user } = await openCustomer();
    await within(history()).findByText(/^15 usuarios/);
    // "+": more pages exist, so the count is what is loaded, not the total.
    expect(within(history()).getByRole('heading')).toHaveTextContent('Historial de simulaciones (1+)');

    await user.click(within(history()).getByRole('button', { name: 'Ver más' }));

    expect(await within(history()).findByText(/^5 usuarios/)).toBeInTheDocument();
    expect(within(history()).getByText(/^15 usuarios/)).toBeInTheDocument();
    expect(within(history()).getByRole('heading')).toHaveTextContent('Historial de simulaciones (2)');
    expect(within(history()).queryByRole('button', { name: 'Ver más' })).not.toBeInTheDocument();
  });

  it('loads a saved simulation back into the simulator', async () => {
    mockApi([aSimulation({ id: 7, activeUsers: 120, storageGb: 300, apiCalls: 2_000_000 })]);
    const { user } = await openCustomer();

    await user.click(await within(history()).findByRole('button', { name: /Cargar en el simulador/ }));

    expect(usersInput()).toHaveValue(120);
    expect(screen.getByRole('spinbutton', { name: 'Almacenamiento' })).toHaveValue(300);
    // 770 € base + 50 GB × 0,20 € + 1.000 blocks × 0,10 € = 880 € + 21 % VAT
    expect(projectedTotal()).toBe('1.064,80 €');
  });
});
