import { Link, Outlet } from 'react-router';
import { CurrencySelector } from '../features/currency/CurrencySelector';
import { RatesBanner, RatesFooter } from '../features/currency/RatesStatus';
import styles from './Layout.module.css';

export function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <div className={styles.brandGroup}>
            <Link to="/" className={styles.brand}>
              SaaS-O-Matic
            </Link>
            <span className={styles.tagline}>Simulador de suscripciones</span>
          </div>
          <CurrencySelector />
        </div>
      </header>
      <div className={styles.bannerSlot}>
        <RatesBanner />
      </div>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.inner}>
          <RatesFooter />
        </div>
      </footer>
    </div>
  );
}
