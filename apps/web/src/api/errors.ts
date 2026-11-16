import { ApiError, type ClientErrorCode } from './http';

const MESSAGES: Record<ClientErrorCode, string> = {
  NETWORK_ERROR: 'No se pudo conectar con el servidor. Comprueba que la API está arrancada.',
  NOT_FOUND: 'El recurso solicitado no existe.',
  CONFLICT: 'Ya existe un registro con esos datos.',
  VALIDATION_ERROR: 'Hay datos no válidos en la petición.',
  INVALID_RESPONSE: 'El servidor devolvió una respuesta inesperada.',
  INTERNAL_ERROR: 'Error inesperado del servidor. Inténtalo de nuevo.',
};

/** User-facing (Spanish) message for any error; API messages are developer-facing (English). */
export function describeError(error: unknown): string {
  return error instanceof ApiError ? MESSAGES[error.code] : MESSAGES.INTERNAL_ERROR;
}

export function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}
