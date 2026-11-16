import type { CountryCode, FiscalIdError, FiscalIdType } from '@saas/shared';

export const TAX_ID_TYPE_LABELS: Record<FiscalIdType, string> = {
  DNI: 'DNI',
  NIE: 'NIE',
  NIF_SPECIAL: 'NIF (K/L/M)',
  CIF: 'CIF',
  GENERIC: 'ID fiscal',
};

type TaxIdMessageCode = FiscalIdError | 'DUPLICATE';

const TAX_ID_MESSAGES: Record<TaxIdMessageCode, string> = {
  EMPTY: 'El identificador fiscal es obligatorio.',
  INVALID_FORMAT: 'Formato no válido: entre 4 y 20 caracteres alfanuméricos.',
  INVALID_CONTROL: 'El carácter de control no coincide: el identificador no es válido.',
  DUPLICATE: 'Ya existe un cliente con este identificador en este país.',
};

const SPANISH_FORMAT_MESSAGE = 'Formato no válido. Ejemplos: 12345678Z (DNI), X1234567L (NIE), B12345674 (CIF).';

const isTaxIdMessageCode = (code: string): code is TaxIdMessageCode => Object.hasOwn(TAX_ID_MESSAGES, code);

/** Maps a reason code (from shared validation or from the API) to a Spanish message. */
export function taxIdMessage(code: string, countryCode: CountryCode): string {
  const known = isTaxIdMessageCode(code) ? code : 'INVALID_FORMAT';
  return known === 'INVALID_FORMAT' && countryCode === 'ES' ? SPANISH_FORMAT_MESSAGE : TAX_ID_MESSAGES[known];
}

export function taxIdHint(countryCode: CountryCode): string {
  return countryCode === 'ES'
    ? 'DNI, NIE o CIF. Se verifica el carácter de control oficial.'
    : 'Entre 4 y 20 caracteres alfanuméricos.';
}
