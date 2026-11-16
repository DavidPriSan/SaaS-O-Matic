import type { CountryCode } from '../catalog/countries';
import { normalizeFiscalId } from './normalize';
import { validateSpanishId } from './spain';
import type { FiscalIdResult } from './types';

const GENERIC_PATTERN = /^[A-Z0-9]{4,20}$/;

/** Strict algorithmic check for Spain; generic format check elsewhere (spec 02, decision A4). */
export function validateFiscalId(raw: string, countryCode: CountryCode): FiscalIdResult {
  const normalized = normalizeFiscalId(raw);

  if (normalized === '') {
    return { valid: false, normalized, reason: 'EMPTY' };
  }

  if (countryCode === 'ES') {
    const check = validateSpanishId(normalized);
    return check.valid
      ? { valid: true, normalized, type: check.type }
      : { valid: false, normalized, reason: check.reason };
  }

  return GENERIC_PATTERN.test(normalized)
    ? { valid: true, normalized, type: 'GENERIC' }
    : { valid: false, normalized, reason: 'INVALID_FORMAT' };
}
