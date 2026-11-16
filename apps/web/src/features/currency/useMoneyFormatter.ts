import { useCallback } from 'react';
import { useCurrency } from './CurrencyContext';
import { formatMoney } from './formatMoney';

/**
 * Single entry point for components to render money. Components never pick a currency themselves:
 * the selected display currency (with EUR fallback) comes from the CurrencyProvider.
 */
export function useMoneyFormatter(): (cents: number) => string {
  const { display } = useCurrency();
  return useCallback((cents: number) => formatMoney(cents, display), [display]);
}
