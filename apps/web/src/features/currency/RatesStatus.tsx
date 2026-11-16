import { Button } from '../../components/Button';
import { formatDateTime } from '../../lib/format';
import { useCurrency } from './CurrencyContext';
import styles from './RatesStatus.module.css';

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
        <span>No se pudieron actualizar los tipos de cambio: se usan los del {formatDateTime(updatedAt)}.</span>
        <Button variant="ghost" onClick={retry}>
          Actualizar
        </Button>
      </div>
    );
  }
  return null;
}

export function RatesFooter() {
  const { updatedAt } = useCurrency();

  return (
    <p className={styles.footer}>
      {updatedAt !== undefined && <>Tipos de cambio actualizados: {formatDateTime(updatedAt)} · </>}
      <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
        Rates By Exchange Rate API
      </a>{' '}
      · Importes convertidos a título informativo; la facturación se realiza en EUR.
    </p>
  );
}
