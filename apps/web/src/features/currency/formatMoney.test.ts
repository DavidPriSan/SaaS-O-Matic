import { describe, expect, it } from 'vitest';
import { formatMoney } from './formatMoney';

// Intl uses non-breaking spaces; `\s` matches them, so expectations stay readable ASCII.
const fmt = (...args: Parameters<typeof formatMoney>) => formatMoney(...args).replace(/\s+/g, ' ');

describe('formatMoney', () => {
  it('formats EUR cents in Spanish locale by default', () => {
    expect(fmt(14000)).toBe('140,00 €');
    expect(fmt(21187)).toBe('211,87 €');
  });

  it('always groups thousands, also for 4-digit amounts (es-ES does not by default)', () => {
    expect(fmt(625570)).toBe('6.255,70 €');
  });

  it('converts with the given rate (units per 1 EUR)', () => {
    expect(fmt(14000, { currency: 'USD', rate: 1.1 })).toBe('154,00 US$');
  });

  it('respects currencies without minor units', () => {
    expect(fmt(14000, { currency: 'JPY', rate: 160.5 })).toBe('22.470 JPY');
  });
});
