import { COUNTRIES, PLANS, type Customer } from '@saas/shared';
import { Link } from 'react-router';
import { Badge } from '../../components/Badge';
import { TAX_ID_TYPE_LABELS } from './labels';
import styles from './CustomerCard.module.css';

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Link to={`/customers/${customer.id}`} className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.name}>{customer.companyName}</h3>
        <Badge tone="primary">{PLANS[customer.plan].name}</Badge>
      </div>
      <dl className={styles.meta}>
        <div>
          <dt>{TAX_ID_TYPE_LABELS[customer.taxIdType]}</dt>
          <dd className={styles.mono}>{customer.taxId}</dd>
        </div>
        <div>
          <dt>País</dt>
          <dd>{COUNTRIES[customer.countryCode].name}</dd>
        </div>
        <div className={styles.wide}>
          <dt>Email</dt>
          <dd className={styles.ellipsis}>{customer.email}</dd>
        </div>
      </dl>
    </Link>
  );
}
