export const COUNTRY_CODES = ['ES', 'PT', 'FR', 'DE', 'IT', 'NL', 'IE', 'GB', 'US', 'MX'] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface CountryInfo {
  readonly code: CountryCode;
  readonly name: string;
  /** Standard VAT rate in basis points (2100 = 21 %). */
  readonly taxRateBp: number;
}

export const COUNTRIES: Readonly<Record<CountryCode, CountryInfo>> = {
  ES: { code: 'ES', name: 'España', taxRateBp: 2100 },
  PT: { code: 'PT', name: 'Portugal', taxRateBp: 2300 },
  FR: { code: 'FR', name: 'Francia', taxRateBp: 2000 },
  DE: { code: 'DE', name: 'Alemania', taxRateBp: 1900 },
  IT: { code: 'IT', name: 'Italia', taxRateBp: 2200 },
  NL: { code: 'NL', name: 'Países Bajos', taxRateBp: 2100 },
  IE: { code: 'IE', name: 'Irlanda', taxRateBp: 2300 },
  GB: { code: 'GB', name: 'Reino Unido', taxRateBp: 2000 },
  US: { code: 'US', name: 'Estados Unidos', taxRateBp: 0 },
  MX: { code: 'MX', name: 'México', taxRateBp: 1600 },
};

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && Object.hasOwn(COUNTRIES, value);
}
