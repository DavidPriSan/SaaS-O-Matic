import { OVERAGE, type PlanInfo, type Quote, type TierLine } from '@saas/shared';
import { formatBasisPoints, formatNumber } from '../../lib/format';
import { useMoneyFormatter } from '../currency/useMoneyFormatter';
import styles from './QuoteBreakdown.module.css';

const tierRange = (tier: TierLine) =>
  tier.to === null ? `más de ${formatNumber(tier.from - 1)}` : `${formatNumber(tier.from)}–${formatNumber(tier.to)}`;

export function QuoteBreakdown({ quote, plan }: { quote: Quote; plan: PlanInfo }) {
  const money = useMoneyFormatter();
  const activeTier = quote.tiers.length - 1;

  return (
    <table className={styles.table}>
      <caption className="visually-hidden">Desglose de la factura mensual</caption>
      <tbody>
        {quote.tiers.map((tier, index) => (
          <tr key={tier.from} className={index === activeTier ? styles.active : undefined}>
            <th scope="row">
              Tramo {index + 1} · {tierRange(tier)} usuarios
              <span className={styles.detail}>
                {formatNumber(tier.units)} × {money(tier.unitPriceCents)}
              </span>
            </th>
            <td>{money(tier.amountCents)}</td>
          </tr>
        ))}
        <tr>
          <th scope="row">
            Almacenamiento extra
            <span className={styles.detail}>
              {formatNumber(quote.storageOverageGb)} GB × {money(OVERAGE.storageCentsPerGb)} · incluidos{' '}
              {formatNumber(plan.includedStorageGb)} GB
            </span>
          </th>
          <td>{money(quote.storageOverageCents)}</td>
        </tr>
        <tr>
          <th scope="row">
            Llamadas API extra
            <span className={styles.detail}>
              {formatNumber(quote.apiOverageBlocks)} bloques de {formatNumber(OVERAGE.apiCallsBlockSize)} ×{' '}
              {money(OVERAGE.apiCentsPerBlock)} · incluidas {formatNumber(plan.includedApiCalls)}
            </span>
          </th>
          <td>{money(quote.apiOverageCents)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Subtotal</th>
          <td>{money(quote.subtotalCents)}</td>
        </tr>
        <tr>
          <th scope="row">IVA ({formatBasisPoints(quote.taxRateBp)})</th>
          <td>{money(quote.taxCents)}</td>
        </tr>
        <tr className={styles.total}>
          <th scope="row">Total mensual</th>
          <td>{money(quote.totalCents)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
