import { DISPLAY_CURRENCIES, type DisplayCurrency } from '@saas/shared';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DisplayRates } from '../../api/exchangeRates';
import { readStorage, writeStorage } from '../../lib/storage';
import { BASE_DISPLAY, type MoneyDisplay } from './formatMoney';
import { useExchangeRates } from './useExchangeRates';

const SELECTED_KEY = 'saas-o-matic:currency';

/** loading: first fetch, no cache · ready · stale: cached rates, refresh failed · error: no rates at all. */
export type RatesStatus = 'loading' | 'ready' | 'stale' | 'error';

export interface CurrencyContextValue {
  selected: DisplayCurrency;
  setSelected: (currency: DisplayCurrency) => void;
  /** What amounts are actually rendered in: falls back to EUR when the selected rate is unavailable. */
  display: MoneyDisplay;
  available: readonly DisplayCurrency[];
  status: RatesStatus;
  updatedAt: number | undefined;
  retry: () => void;
}

const FALLBACK: CurrencyContextValue = {
  selected: 'EUR',
  setSelected: () => undefined,
  display: BASE_DISPLAY,
  available: ['EUR'],
  status: 'ready',
  updatedAt: undefined,
  retry: () => undefined,
};

const CurrencyContext = createContext<CurrencyContextValue>(FALLBACK);

const isDisplayCurrency = (value: unknown): value is DisplayCurrency =>
  DISPLAY_CURRENCIES.some((currency) => currency === value);

function readSelected(): DisplayCurrency {
  const stored = readStorage(SELECTED_KEY);
  return isDisplayCurrency(stored) ? stored : 'EUR';
}

function resolveDisplay(selected: DisplayCurrency, rates: DisplayRates | undefined): MoneyDisplay {
  const rate = rates?.[selected];
  return selected !== 'EUR' && rate !== undefined ? { currency: selected, rate } : BASE_DISPLAY;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const rates = useExchangeRates();
  const [selected, setSelectedState] = useState<DisplayCurrency>(readSelected);

  const setSelected = useCallback((currency: DisplayCurrency) => {
    setSelectedState(currency);
    writeStorage(SELECTED_KEY, currency);
  }, []);

  const { data, isPending, isError, refetch } = rates;
  const value = useMemo<CurrencyContextValue>(
    () => ({
      selected,
      setSelected,
      display: resolveDisplay(selected, data?.rates),
      available: data ? DISPLAY_CURRENCIES.filter((currency) => data.rates[currency] !== undefined) : ['EUR'],
      status: isPending ? 'loading' : !data ? 'error' : isError ? 'stale' : 'ready',
      updatedAt: data?.updatedAt,
      retry: () => void refetch(),
    }),
    [selected, setSelected, data, isPending, isError, refetch],
  );

  return <CurrencyContext value={value}>{children}</CurrencyContext>;
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
