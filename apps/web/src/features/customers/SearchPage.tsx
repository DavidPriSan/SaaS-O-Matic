import { SEARCH_QUERY_MAX_LENGTH, type Customer } from '@saas/shared';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { describeError } from '../../api/errors';
import { ButtonLink } from '../../components/Button';
import { LoadMore } from '../../components/LoadMore';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, SkeletonGrid } from '../../components/StatusViews';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { CustomerCard } from './CustomerCard';
import { useCustomerSearch } from './hooks';
import styles from './SearchPage.module.css';

const SEARCH_DEBOUNCE_MS = 300;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  // A hand-edited ?q= could exceed what the API accepts: clamp it like the input does.
  const [term, setTerm] = useState(() => (params.get('q') ?? '').slice(0, SEARCH_QUERY_MAX_LENGTH));
  const debouncedTerm = useDebouncedValue(term.trim(), SEARCH_DEBOUNCE_MS);
  const search = useCustomerSearch(debouncedTerm);

  // Keep ?q= in the URL so the search survives reloads and the back button.
  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedTerm) {
      setParams(debouncedTerm ? { q: debouncedTerm } : {}, { replace: true });
    }
  }, [debouncedTerm, params, setParams]);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Busca un cliente corporativo para ver su detalle y simular su suscripción."
        actions={<ButtonLink to="/customers/new">+ Nuevo cliente</ButtonLink>}
      />

      <div className={styles.searchBar}>
        <label htmlFor="customer-search" className="visually-hidden">
          Buscar por empresa o identificador fiscal
        </label>
        <input
          id="customer-search"
          type="search"
          className={styles.searchInput}
          placeholder="Buscar por empresa o NIF/CIF…"
          value={term}
          maxLength={SEARCH_QUERY_MAX_LENGTH}
          onChange={(event) => setTerm(event.target.value)}
          autoComplete="off"
        />
        {search.isFetching && !search.isPending && !search.isFetchingNextPage && (
          <span className={styles.fetching}>Buscando…</span>
        )}
      </div>

      {search.isPending ? (
        <SkeletonGrid />
      ) : search.isError && !search.isFetchNextPageError ? (
        <ErrorState message={describeError(search.error)} onRetry={() => void search.refetch()} />
      ) : (
        <>
          <Results customers={search.data} term={debouncedTerm} hasMore={search.hasNextPage} />
          {search.hasNextPage && (
            <LoadMore
              onLoadMore={() => void search.fetchNextPage()}
              loading={search.isFetchingNextPage}
              failed={search.isFetchNextPageError}
            />
          )}
        </>
      )}
    </>
  );
}

function Results({ customers, term, hasMore }: { customers: Customer[]; term: string; hasMore: boolean }) {
  if (customers.length === 0) {
    return term ? (
      <EmptyState
        title={`Sin resultados para «${term}»`}
        description="Prueba con otro nombre o con el identificador fiscal."
      />
    ) : (
      <EmptyState
        title="Aún no hay clientes"
        description="Registra el primer cliente para empezar a simular."
        action={<ButtonLink to="/customers/new">Registrar cliente</ButtonLink>}
      />
    );
  }

  return (
    <section aria-label="Resultados">
      <p className={styles.count}>{resultsCount(customers.length, term, hasMore)}</p>
      <ul className={styles.grid}>
        {customers.map((customer) => (
          <li key={customer.id}>
            <CustomerCard customer={customer} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** While more pages exist, the count says the list is incomplete (spec 05). */
function resultsCount(count: number, term: string, hasMore: boolean): string {
  if (!hasMore) return term ? `${count} resultado(s)` : `Últimos ${count} clientes registrados`;
  return term ? `Mostrando ${count} resultado(s); hay más` : `Últimos ${count} clientes registrados; hay más`;
}
