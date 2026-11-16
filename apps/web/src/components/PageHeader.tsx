import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: { to: string; label: string };
}

export function PageHeader({ title, subtitle, actions, backTo }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {backTo && (
        <Link to={backTo.to} className={styles.back}>
          ← {backTo.label}
        </Link>
      )}
      <div className={styles.row}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
