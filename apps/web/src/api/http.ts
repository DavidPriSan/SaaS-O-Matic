import { apiErrorSchema, type ApiErrorCode } from '@saas/shared';

export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE';

export interface ErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Structural type so the client does not depend on Zod directly; any shared schema fits. */
interface Parser<T> {
  parse(data: unknown): T;
}

interface RequestOptions<T> {
  method?: 'GET' | 'POST';
  body?: unknown;
  schema: Parser<T>;
  signal?: AbortSignal | undefined;
}

export const API_BASE = '/api';

/** Every response is validated: a backend contract change surfaces as an error, not as a broken UI. */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, schema, signal }: RequestOptions<T>,
): Promise<T> {
  const response = await send(`${API_BASE}${path}`, {
    method,
    signal: signal ?? null,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  try {
    return schema.parse(payload);
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'Unexpected response shape');
  }
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(payload);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(status, code, message, details ?? []);
  }
  // No envelope: the dev proxy could not reach the API (or something in between failed).
  return new ApiError(status, status >= 500 ? 'NETWORK_ERROR' : 'INTERNAL_ERROR', `HTTP ${status}`);
}
