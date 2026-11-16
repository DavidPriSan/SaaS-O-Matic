import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aCustomer, errorBody, mockFetch, renderRoute } from '../../test/utils';

async function fillForm(user: ReturnType<typeof renderRoute>['user'], taxId: string) {
  await user.type(screen.getByLabelText('Nombre de la empresa'), 'Acme Ibérica S.L.');
  await user.type(screen.getByLabelText('Identificador fiscal'), taxId);
  await user.type(screen.getByLabelText('Email de contacto'), 'it@acme.es');
}

describe('NewCustomerPage', () => {
  it('validates the Spanish tax ID with the official algorithm before calling the API', async () => {
    const requests = mockFetch(() => ({ status: 201, body: aCustomer() }));
    const { user } = renderRoute('/customers/new');

    await fillForm(user, '12345678A');
    await user.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    expect(screen.getByText(/carácter de control no coincide/)).toBeInTheDocument();
    expect(screen.getByLabelText('Identificador fiscal')).toHaveAttribute('aria-invalid', 'true');
    expect(requests).toHaveLength(0);
  });

  it('confirms the detected ID type while typing', async () => {
    mockFetch(() => ({ body: aCustomer() }));
    const { user } = renderRoute('/customers/new');

    await user.type(screen.getByLabelText('Identificador fiscal'), 'x1234567l');

    expect(screen.getByText('NIE válido')).toBeInTheDocument();
  });

  it('only applies the generic format outside Spain', async () => {
    mockFetch(() => ({ body: aCustomer() }));
    const { user } = renderRoute('/customers/new');

    await user.selectOptions(screen.getByLabelText('País'), 'FR');
    await user.type(screen.getByLabelText('Identificador fiscal'), '12345678A');

    expect(screen.getByText('ID fiscal válido')).toBeInTheDocument();
  });

  it('sends the raw input and navigates to the new customer on success', async () => {
    const requests = mockFetch(({ method }) =>
      method === 'POST' ? { status: 201, body: aCustomer({ id: 42 }) } : { body: aCustomer({ id: 42 }) },
    );
    const { user, router } = renderRoute('/customers/new');

    await fillForm(user, 'b-12345674');
    await user.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    expect(await screen.findByRole('heading', { name: 'Acme Ibérica S.L.' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/customers/42');
    expect(requests[0]?.body).toEqual({
      companyName: 'Acme Ibérica S.L.',
      taxId: 'b-12345674',
      email: 'it@acme.es',
      countryCode: 'ES',
      plan: 'basic',
    });
  });

  it('maps a 409 from the API to the tax ID field and clears it on edit', async () => {
    mockFetch(() => ({ status: 409, body: errorBody('CONFLICT', [{ path: 'taxId', message: 'DUPLICATE' }]) }));
    const { user } = renderRoute('/customers/new');

    await fillForm(user, 'B12345674');
    await user.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    expect(await screen.findByText(/Ya existe un cliente con este identificador/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Identificador fiscal'), '{backspace}4');
    expect(screen.queryByText(/Ya existe un cliente/)).not.toBeInTheDocument();
    // Audit finding: clearing the field error must not surface a misleading generic banner instead.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a general message when the API is unreachable', async () => {
    mockFetch(() => ({ status: 502, body: 'Bad gateway' }));
    const { user } = renderRoute('/customers/new');

    await fillForm(user, 'B12345674');
    await user.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo conectar con el servidor/);
  });
});
