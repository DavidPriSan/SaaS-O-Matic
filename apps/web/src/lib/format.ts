const LOCALE = 'es-ES';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
// es-ES does not group 4-digit numbers by default ("1000" vs "10.000"); force consistency.
const numberFormatter = new Intl.NumberFormat(LOCALE, { useGrouping: 'always' });

export const formatDate = (iso: string): string => dateFormatter.format(new Date(iso));

export const formatDateTime = (iso: string): string => dateTimeFormatter.format(new Date(iso));

export const formatNumber = (value: number): string => numberFormatter.format(value);

/** 2100 bp → "21 %" */
export const formatBasisPoints = (bp: number): string => `${new Intl.NumberFormat(LOCALE).format(bp / 100)} %`;
