import type { FiscalIdError, SpanishIdType } from './types';

type SpanishCheck = { valid: true; type: SpanishIdType } | { valid: false; reason: FiscalIdError };

const CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';

const DNI_PATTERN = /^\d{8}[A-Z]$/;
const NIE_PATTERN = /^[XYZ]\d{7}[A-Z]$/;
const NIF_SPECIAL_PATTERN = /^[KLM]\d{7}[A-Z]$/;
const CIF_PATTERN = /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/;

const CIF_LETTER_CONTROL = 'PQRSNW';
const CIF_DIGIT_CONTROL = 'ABEH';

/**
 * Validates an already-normalized Spanish identifier with the official check algorithms (spec 02 §3).
 * Patterns are tested first, so fixed positions (slice/charAt) are safe afterwards.
 */
export function validateSpanishId(id: string): SpanishCheck {
  if (DNI_PATTERN.test(id)) {
    return result(controlLetter(Number(id.slice(0, 8))) === id.charAt(8), 'DNI');
  }
  if (NIE_PATTERN.test(id)) {
    const prefixDigit = 'XYZ'.indexOf(id.charAt(0));
    return result(controlLetter(Number(`${prefixDigit}${id.slice(1, 8)}`)) === id.charAt(8), 'NIE');
  }
  if (NIF_SPECIAL_PATTERN.test(id)) {
    return result(controlLetter(Number(id.slice(1, 8))) === id.charAt(8), 'NIF_SPECIAL');
  }
  if (CIF_PATTERN.test(id)) {
    return result(isValidCifControl(id.charAt(0), id.slice(1, 8), id.charAt(8)), 'CIF');
  }
  return { valid: false, reason: 'INVALID_FORMAT' };
}

function result(valid: boolean, type: SpanishIdType): SpanishCheck {
  return valid ? { valid: true, type } : { valid: false, reason: 'INVALID_CONTROL' };
}

function controlLetter(value: number): string {
  return CONTROL_LETTERS.charAt(value % 23);
}

function isValidCifControl(entity: string, digits: string, control: string): boolean {
  const digit = cifControlDigit(digits);
  const asDigit = String(digit);
  const asLetter = CIF_CONTROL_LETTERS.charAt(digit);

  if (CIF_LETTER_CONTROL.includes(entity)) return control === asLetter;
  if (CIF_DIGIT_CONTROL.includes(entity)) return control === asDigit;
  return control === asDigit || control === asLetter;
}

/** Odd positions (1,3,5,7) are doubled and their digits summed; even positions are added as-is. */
function cifControlDigit(digits: string): number {
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    const value = Number(digits.charAt(index));
    if (index % 2 === 0) {
      const doubled = value * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sum += value;
    }
  }
  return (10 - (sum % 10)) % 10;
}
