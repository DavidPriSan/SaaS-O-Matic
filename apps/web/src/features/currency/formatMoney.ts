import { BASE_CURRENCY } from '@saas/shared';

export interface MoneyDisplay {
  /** ISO 4217 code used for display. */
  currency: string;
  /** Units of `currency` per 1 EUR. */
  rate: number;
}

export const BASE_DISPLAY: MoneyDisplay = { currency: BASE_CURRENCY, rate: 1 };

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    // useGrouping 'always': es-ES would otherwise print "6255,70 €" but "16.940,00 €".
    formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency, useGrouping: 'always' });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/**
 * Converts EUR cents to the display currency and formats it. This is the ONLY place where money
 * stops being integer cents (ADR-002): rounding happens here, at presentation time.
 */
export function formatMoney(cents: number, display: MoneyDisplay = BASE_DISPLAY): string {
  return formatterFor(display.currency).format((cents / 100) * display.rate);
}

const rateFormatter = new Intl.NumberFormat('es-ES', { maximumSignificantDigits: 5 });

/** "1 EUR = 1,103 USD" */
export const formatRate = ({ currency, rate }: MoneyDisplay): string =>
  `1 ${BASE_CURRENCY} = ${rateFormatter.format(rate)} ${currency}`;
