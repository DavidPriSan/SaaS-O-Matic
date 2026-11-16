import { customerSchema } from '@saas/shared';
import { describe, expect, it, vi } from 'vitest';
import { aCustomer, errorBody, mockFetch } from '../test/utils';
import { describeError } from './errors';
import { ApiError, apiRequest } from './http';

describe('apiRequest', () => {
  it('prefixes /api and returns the parsed body', async () => {
    const requests = mockFetch(() => ({ body: aCustomer() }));

    await expect(apiRequest('/customers/1', { schema: customerSchema })).resolves.toEqual(aCustomer());
    expect(requests[0]?.url).toBe('/api/customers/1');
  });

  it('turns the API error envelope into an ApiError with code and details', async () => {
    mockFetch(() => ({ status: 409, body: errorBody('CONFLICT', [{ path: 'taxId', message: 'DUPLICATE' }]) }));

    const error = await apiRequest('/customers', { method: 'POST', body: {}, schema: customerSchema }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CONFLICT', details: [{ path: 'taxId', message: 'DUPLICATE' }] });
  });

  it('reports NETWORK_ERROR when fetch itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/x', { schema: customerSchema })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('reports NETWORK_ERROR for a 5xx without envelope (dev proxy cannot reach the API)', async () => {
    mockFetch(() => ({ status: 502, body: 'Bad gateway' }));

    await expect(apiRequest('/x', { schema: customerSchema })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('reports INVALID_RESPONSE for a 4xx without the API envelope (audit finding)', async () => {
    mockFetch(() => ({ status: 404, body: '<html>Not Found</html>' }));

    await expect(apiRequest('/x', { schema: customerSchema })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('reports INVALID_RESPONSE when a 200 does not match the contract', async () => {
    mockFetch(() => ({ body: { unexpected: true } }));

    await expect(apiRequest('/x', { schema: customerSchema })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});

describe('describeError', () => {
  it('gives Spanish user-facing messages', () => {
    expect(describeError(new ApiError(0, 'NETWORK_ERROR', 'x'))).toMatch(/No se pudo conectar/);
    expect(describeError(new Error('boom'))).toMatch(/Error inesperado/);
  });
});
