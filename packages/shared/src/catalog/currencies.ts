/** Currency in which every amount is calculated and persisted. */
export const BASE_CURRENCY = 'EUR';

/** Currencies offered in the UI selector (display only). */
export const DISPLAY_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'JPY'] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];
