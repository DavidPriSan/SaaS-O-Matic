import { describe, expect, it } from 'vitest';
import { normalizeFiscalId } from './normalize';
import { validateFiscalId } from './validateFiscalId';

describe('normalizeFiscalId', () => {
  it('trims, uppercases and strips spaces, dots and dashes', () => {
    expect(normalizeFiscalId('  12.345.678-z ')).toBe('12345678Z');
    expect(normalizeFiscalId('b 1234 5674')).toBe('B12345674');
  });
});

describe('validateFiscalId · Spain (spec 02 §5)', () => {
  it.each([
    ['12345678Z', '12345678Z', 'DNI'],
    ['12.345.678-z', '12345678Z', 'DNI'],
    ['X1234567L', 'X1234567L', 'NIE'],
    ['Y1234567X', 'Y1234567X', 'NIE'],
    ['K1234567L', 'K1234567L', 'NIF_SPECIAL'],
    ['B12345674', 'B12345674', 'CIF'],
    ['Q1234567D', 'Q1234567D', 'CIF'],
    ['G12345674', 'G12345674', 'CIF'],
    ['G1234567D', 'G1234567D', 'CIF'],
  ] as const)('accepts %s as %s (%s)', (raw, normalized, type) => {
    expect(validateFiscalId(raw, 'ES')).toEqual({ valid: true, normalized, type });
  });

  it.each([
    ['12345678A', 'INVALID_CONTROL'],
    ['X1234567A', 'INVALID_CONTROL'],
    ['K1234567A', 'INVALID_CONTROL'],
    ['B1234567D', 'INVALID_CONTROL'], // B requires a digit
    ['Q12345674', 'INVALID_CONTROL'], // Q requires a letter
    ['B12345670', 'INVALID_CONTROL'],
    ['1234567Z', 'INVALID_FORMAT'],
    ['I12345674', 'INVALID_FORMAT'], // I is not a valid entity letter
    ['B1234567$', 'INVALID_FORMAT'],
    ['123456789Z', 'INVALID_FORMAT'],
    ['', 'EMPTY'],
    ['   ', 'EMPTY'],
  ] as const)('rejects %j with %s', (raw, reason) => {
    const result = validateFiscalId(raw, 'ES');
    expect(result.valid).toBe(false);
    expect(result).toMatchObject({ reason });
  });

  it.each([
    ['A28015865', 'Telefónica'],
    ['A46103834', 'Mercadona'],
    ['A15075062', 'Inditex'],
  ])('accepts the real public CIF %s (%s)', (cif) => {
    expect(validateFiscalId(cif, 'ES')).toEqual({ valid: true, normalized: cif, type: 'CIF' });
  });

  it('returns the normalized value even when invalid (useful for error messages)', () => {
    expect(validateFiscalId('12.345.678-a', 'ES')).toMatchObject({ valid: false, normalized: '12345678A' });
  });
});

describe('validateFiscalId · other countries (generic format)', () => {
  it.each([
    ['DE123456789', 'DE', 'DE123456789'],
    ['fr-ab12', 'FR', 'FRAB12'],
    ['12345678A', 'FR', '12345678A'], // no Spanish algorithm outside Spain (decision A4)
  ] as const)('accepts %s for %s', (raw, country, normalized) => {
    expect(validateFiscalId(raw, country)).toEqual({ valid: true, normalized, type: 'GENERIC' });
  });

  it.each([
    ['a-1', 'INVALID_FORMAT'],
    ['A'.repeat(21), 'INVALID_FORMAT'],
    ['AB#123', 'INVALID_FORMAT'],
    ['', 'EMPTY'],
  ] as const)('rejects %j with %s', (raw, reason) => {
    expect(validateFiscalId(raw, 'GB')).toMatchObject({ valid: false, reason });
  });
});
