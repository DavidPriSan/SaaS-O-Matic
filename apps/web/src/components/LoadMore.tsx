import { Button } from './Button';
import styles from './LoadMore.module.css';

interface LoadMoreProps {
  onLoadMore: () => void;
  loading: boolean;
  failed: boolean;
}

/** "Ver más" for cursor-paginated lists (spec 05): appends the next page below what is already shown. */
export function LoadMore({ onLoadMore, loading, failed }: LoadMoreProps) {
  return (
    <div className={styles.loadMore}>
      {failed && (
        <p className={styles.error} role="alert">
          No se pudieron cargar más resultados.
        </p>
      )}
      <Button variant="secondary" onClick={onLoadMore} loading={loading}>
        {failed ? 'Reintentar' : 'Ver más'}
      </Button>
    </div>
  );
}
