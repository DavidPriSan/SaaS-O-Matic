import type { ApiErrorCode } from '@saas/shared';

export interface ErrorDetail {
  path: string;
  message: string;
}

/** Domain error carrying its HTTP mapping; translated by the single error handler. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(409, 'CONFLICT', message, details);
  }
}
