const LOCALE = 'es-ES';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
// es-ES does not group 4-digit numbers by default ("1000" vs "10.000"); force consistency.
const numberFormatter = new Intl.NumberFormat(LOCALE, { useGrouping: 'always' });

/** Accepts an ISO string or epoch milliseconds. */
type DateInput = string | number;

export const formatDate = (value: DateInput): string => dateFormatter.format(new Date(value));

export const formatDateTime = (value: DateInput): string => dateTimeFormatter.format(new Date(value));

export const formatNumber = (value: number): string => numberFormatter.format(value);

/** 2100 bp → "21 %" */
export const formatBasisPoints = (bp: number): string => `${new Intl.NumberFormat(LOCALE).format(bp / 100)} %`;
