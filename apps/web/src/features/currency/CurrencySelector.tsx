import { useCurrency } from './CurrencyContext';
import styles from './CurrencySelector.module.css';

export function CurrencySelector() {
  const { selected, setSelected, available, status, display } = useCurrency();
  const loading = status === 'loading';

  return (
    <div className={styles.selector}>
      <label htmlFor="currency-select" className={styles.label}>
        Divisa
      </label>
      <select
        id="currency-select"
        className={styles.select}
        // Shows what is actually rendered: EUR when the selected rate is not available.
        value={display.currency === selected ? selected : 'EUR'}
        disabled={loading || available.length <= 1}
        aria-busy={loading}
        onChange={(event) => {
          const currency = available.find((code) => code === event.target.value);
          if (currency) setSelected(currency);
        }}
      >
        {available.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      {loading && (
        <span className={styles.loading} role="status">
          Cargando tipos…
        </span>
      )}
    </div>
  );
}
