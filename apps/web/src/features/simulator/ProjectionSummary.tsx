import type { Quote } from '@saas/shared';
import { useCurrency } from '../currency/CurrencyContext';
import { BASE_DISPLAY, formatMoney, formatRate } from '../currency/formatMoney';
import { useMoneyFormatter } from '../currency/useMoneyFormatter';
import styles from './Simulator.module.css';

export function ProjectionSummary({ quote, activeUsers }: { quote: Quote; activeUsers: number }) {
  const money = useMoneyFormatter();
  const { display } = useCurrency();

  return (
    <p className={styles.projection}>
      <span className={styles.projectionLabel}>Proyección mensual</span>
      <strong data-testid="projected-total">{money(quote.totalCents)}</strong>
      <span className={styles.perUser}>
        ≈ {money(Math.round(quote.baseCents / activeUsers))} / usuario (sin IVA ni extras)
      </span>
      {display.currency !== BASE_DISPLAY.currency && (
        // The billed amount is always EUR: keep it visible when another display currency is selected.
        <span className={styles.perUser} data-testid="eur-equivalent">
          Se factura en EUR: {formatMoney(quote.totalCents)} · {formatRate(display)}
        </span>
      )}
    </p>
  );
}
