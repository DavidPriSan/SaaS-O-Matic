import type { Customer } from '@saas/shared';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { describeError } from '../../api/errors';
import { ButtonLink } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, SkeletonGrid } from '../../components/StatusViews';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { CustomerCard } from './CustomerCard';
import { useCustomerSearch } from './hooks';
import styles from './SearchPage.module.css';

const SEARCH_DEBOUNCE_MS = 300;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [term, setTerm] = useState(() => params.get('q') ?? '');
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
          onChange={(event) => setTerm(event.target.value)}
          autoComplete="off"
        />
        {search.isFetching && !search.isPending && <span className={styles.fetching}>Buscando…</span>}
      </div>

      {search.isPending ? (
        <SkeletonGrid />
      ) : search.isError ? (
        <ErrorState message={describeError(search.error)} onRetry={() => void search.refetch()} />
      ) : (
        <Results customers={search.data} term={debouncedTerm} />
      )}
    </>
  );
}

function Results({ customers, term }: { customers: Customer[]; term: string }) {
  if (customers.length === 0) {
    return term ? (
      <EmptyState title={`Sin resultados para «${term}»`} description="Prueba con otro nombre o con el identificador fiscal." />
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
      <p className={styles.count}>
        {term ? `${customers.length} resultado(s)` : `Últimos ${customers.length} clientes registrados`}
      </p>
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
