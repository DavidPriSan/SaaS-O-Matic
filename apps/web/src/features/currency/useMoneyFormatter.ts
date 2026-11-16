import { useCallback } from 'react';
import { BASE_DISPLAY, formatMoney } from './formatMoney';

/**
 * Single entry point for components to render money. Components never call formatMoney with
 * a currency themselves, so switching the display currency only changes this hook.
 */
export function useMoneyFormatter(): (cents: number) => string {
  return useCallback((cents: number) => formatMoney(cents, BASE_DISPLAY), []);
}
