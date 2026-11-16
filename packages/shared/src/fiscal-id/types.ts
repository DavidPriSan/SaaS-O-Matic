export const FISCAL_ID_TYPES = ['DNI', 'NIE', 'NIF_SPECIAL', 'CIF', 'GENERIC'] as const;

export type FiscalIdType = (typeof FISCAL_ID_TYPES)[number];

export type SpanishIdType = Exclude<FiscalIdType, 'GENERIC'>;

export type FiscalIdError = 'EMPTY' | 'INVALID_FORMAT' | 'INVALID_CONTROL';

export type FiscalIdResult =
  | { valid: true; normalized: string; type: FiscalIdType }
  | { valid: false; normalized: string; reason: FiscalIdError };
