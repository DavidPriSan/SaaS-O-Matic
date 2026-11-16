import { Link, Outlet } from 'react-router';
import styles from './Layout.module.css';

export function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            SaaS-O-Matic
          </Link>
          <span className={styles.tagline}>Simulador de suscripciones</span>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
