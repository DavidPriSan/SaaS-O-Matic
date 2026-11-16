import type { Customer } from '@saas/shared';
import { useParams } from 'react-router';
import { describeError } from '../../api/errors';
import { ApiError } from '../../api/http';
import { ButtonLink } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, SkeletonGrid } from '../../components/StatusViews';
import { TAX_ID_TYPE_LABELS } from './labels';
import { CustomerInfoCard } from './CustomerInfoCard';
import { useSimulatorInputs } from '../simulator/hooks';
import { SimulationHistory } from '../simulator/SimulationHistory';
import { Simulator } from '../simulator/Simulator';
import styles from './CustomerDetailPage.module.css';
import { useCustomer } from './hooks';

const BACK = { to: '/', label: 'Volver a clientes' };

function parseId(raw: string | undefined): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function CustomerDetailPage() {
  const id = parseId(useParams().id);
  return id === null ? <CustomerNotFound /> : <CustomerDetail id={id} />;
}

function CustomerDetail({ id }: { id: number }) {
  const customer = useCustomer(id);

  if (customer.isPending) return <SkeletonGrid count={1} />;

  if (customer.isError) {
    return customer.error instanceof ApiError && customer.error.code === 'NOT_FOUND' ? (
      <CustomerNotFound />
    ) : (
      <ErrorState message={describeError(customer.error)} onRetry={() => void customer.refetch()} />
    );
  }

  return <CustomerWorkspace customer={customer.data} />;
}

function CustomerWorkspace({ customer }: { customer: Customer }) {
  // Lifted here so the history can load a saved simulation back into the simulator.
  const { inputs, setInput, setInputs } = useSimulatorInputs();

  return (
    <>
      <PageHeader
        title={customer.companyName}
        subtitle={`${TAX_ID_TYPE_LABELS[customer.taxIdType]} ${customer.taxId}`}
        backTo={BACK}
      />
      <div className={styles.stack}>
        <CustomerInfoCard customer={customer} />
        <div className={styles.workspace}>
          <Simulator customer={customer} inputs={inputs} onInputChange={setInput} />
          <SimulationHistory customerId={customer.id} onLoad={setInputs} />
        </div>
      </div>
    </>
  );
}

function CustomerNotFound() {
  return (
    <EmptyState
      title="Cliente no encontrado"
      description="Puede que el enlace sea incorrecto o que el cliente no exista."
      action={<ButtonLink to="/">Volver a clientes</ButtonLink>}
    />
  );
}
