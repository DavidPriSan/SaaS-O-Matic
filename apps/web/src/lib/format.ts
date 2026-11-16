const LOCALE = 'es-ES';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
// es-ES does not group 4-digit numbers by default ("1000" vs "10.000"); force consistency.
const numberFormatter = new Intl.NumberFormat(LOCALE, { useGrouping: 'always' });

/** Accepts an ISO string or epoch milliseconds. */
type DateInput = string | number;

export const formatDate = (value: DateInput): string => dateFormatter.format(new Date(value));

export const formatDateTime = (value: DateInput): string => dateTimeFormatter.format(new Date(value));

// No timeZone option: Intl uses the viewer's own time zone (the browser's), which is what we want.
const shortDateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
const zoneFormatter = new Intl.DateTimeFormat(LOCALE, { timeZoneName: 'short' });

/** "17 nov, 1:18" in the viewer's time zone. */
export const formatShortDateTime = (value: DateInput): string => shortDateTimeFormatter.format(new Date(value));

/** Viewer's time zone abbreviation at that instant: "CET" in winter, "CEST" in summer. */
export const formatTimeZone = (value: DateInput): string =>
  zoneFormatter.formatToParts(new Date(value)).find((part) => part.type === 'timeZoneName')?.value ?? '';

export const formatNumber = (value: number): string => numberFormatter.format(value);

/** 2100 bp → "21 %" */
export const formatBasisPoints = (bp: number): string => `${new Intl.NumberFormat(LOCALE).format(bp / 100)} %`;
