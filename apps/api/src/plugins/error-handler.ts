import { PricingInputError, type ApiErrorBody, type ApiErrorCode } from '@saas/shared';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError, type ErrorDetail } from '../errors';

interface ErrorResponse {
  statusCode: number;
  body: ApiErrorBody;
}

/** Maps every error to the single envelope of spec 03. Never leaks stack traces. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const { statusCode, body } = toErrorResponse(error);
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled error');
    }
    return reply.code(statusCode).send(body);
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send(errorBody('NOT_FOUND', `Route ${request.method} ${request.url} not found`)),
  );
}

function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    return { statusCode: 400, body: errorBody('VALIDATION_ERROR', 'Invalid request data', details) };
  }
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, body: errorBody(error.code, error.message, error.details) };
  }
  if (error instanceof PricingInputError) {
    const details = [{ path: error.field, message: error.message }];
    return { statusCode: 400, body: errorBody('VALIDATION_ERROR', 'Invalid pricing input', details) };
  }
  if (isClientError(error)) {
    // Fastify's own 4xx errors: malformed JSON, body too large, unsupported content type…
    return { statusCode: error.statusCode, body: errorBody('VALIDATION_ERROR', error.message) };
  }
  return { statusCode: 500, body: errorBody('INTERNAL_ERROR', 'Unexpected server error') };
}

function isClientError(error: unknown): error is Error & { statusCode: number } {
  return (
    error instanceof Error &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );
}

function errorBody(code: ApiErrorCode, message: string, details?: ErrorDetail[]): ApiErrorBody {
  return { error: details ? { code, message, details } : { code, message } };
}
