import { COUNTRIES, PLANS, type Customer } from '@saas/shared';
import { Badge } from '../../components/Badge';
import { formatBasisPoints, formatDate, formatNumber } from '../../lib/format';
import { TAX_ID_TYPE_LABELS } from './labels';
import styles from './CustomerInfoCard.module.css';

export function CustomerInfoCard({ customer }: { customer: Customer }) {
  const country = COUNTRIES[customer.countryCode];
  const plan = PLANS[customer.plan];

  return (
    <section className={styles.card} aria-labelledby="customer-info-title">
      <div className={styles.header}>
        <h2 id="customer-info-title" className={styles.title}>
          Datos del cliente
        </h2>
        <Badge tone="primary">Plan {plan.name}</Badge>
      </div>
      <dl className={styles.list}>
        <div>
          <dt>{TAX_ID_TYPE_LABELS[customer.taxIdType]}</dt>
          <dd className={styles.mono}>{customer.taxId}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd className={styles.ellipsis}>
            <a href={`mailto:${customer.email}`}>{customer.email}</a>
          </dd>
        </div>
        <div>
          <dt>País</dt>
          <dd>
            {country.name} · IVA {formatBasisPoints(country.taxRateBp)}
          </dd>
        </div>
        <div>
          <dt>Incluido en el plan</dt>
          <dd>
            {formatNumber(plan.includedStorageGb)} GB · {formatNumber(plan.includedApiCalls)} llamadas API/mes
          </dd>
        </div>
        <div>
          <dt>Alta</dt>
          <dd>{formatDate(customer.createdAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
