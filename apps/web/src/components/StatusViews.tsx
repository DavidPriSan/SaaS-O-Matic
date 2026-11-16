import type { ReactNode } from 'react';
import { Button } from './Button';
import styles from './StatusViews.module.css';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Algo ha fallado', message, onRetry }: ErrorStateProps) {
  return (
    <div className={`${styles.box} ${styles.error}`} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.text}>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.box}>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.text}>{description}</p>}
      {action}
    </div>
  );
}

export function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.skeletonGrid} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.skeleton} />
      ))}
    </div>
  );
}
