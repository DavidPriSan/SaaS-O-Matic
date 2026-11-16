import { Button } from '../../components/Button';
import { formatDateTime, formatShortDateTime, formatTimeZone } from '../../lib/format';
import { useCurrency } from './CurrencyContext';
import styles from './RatesStatus.module.css';

/** "16 nov 2026, 1:02 (CET)": provider publication time, shown in the viewer's own time zone. */
const publishedAt = (epochMs: number) => `${formatDateTime(epochMs)} (${formatTimeZone(epochMs)})`;

/** Non-blocking: the app stays fully usable in EUR while rates are unavailable. */
export function RatesBanner() {
  const { status, retry, updatedAt } = useCurrency();

  if (status === 'error') {
    return (
      <div className={`${styles.banner} ${styles.error}`} role="alert">
        <span>No se pudieron cargar los tipos de cambio. Los importes se muestran en EUR.</span>
        <Button variant="secondary" onClick={retry}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (status === 'stale' && updatedAt !== undefined) {
    return (
      <div className={`${styles.banner} ${styles.warning}`} role="status">
        <span>No se pudieron actualizar los tipos de cambio: se usan los publicados el {publishedAt(updatedAt)}.</span>
        <Button variant="ghost" onClick={retry}>
          Actualizar
        </Button>
      </div>
    );
  }
  return null;
}

export function RatesFooter() {
  const { updatedAt, nextUpdateAt } = useCurrency();

  return (
    <p className={styles.footer}>
      {updatedAt !== undefined && <>Tipos publicados el {publishedAt(updatedAt)}</>}
      {nextUpdateAt !== undefined && <> · próxima actualización: {formatShortDateTime(nextUpdateAt)}</>}
      {updatedAt !== undefined && ' · '}
      <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
        Rates By Exchange Rate API
      </a>{' '}
      · Importes convertidos a título informativo; la facturación se realiza en EUR.
    </p>
  );
}
