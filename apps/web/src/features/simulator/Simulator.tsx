import { computeQuote, PLANS, type Customer } from '@saas/shared';
import { useMemo, useState } from 'react';
import { describeError } from '../../api/errors';
import { Button } from '../../components/Button';
import { formatNumber } from '../../lib/format';
import { serverAgreesWithClient, useCreateSimulation, type SimulatorInputs } from './hooks';
import { ProjectionSummary } from './ProjectionSummary';
import { QuoteBreakdown } from './QuoteBreakdown';
import styles from './Simulator.module.css';
import { UsageControls } from './UsageControls';

interface SimulatorProps {
  customer: Customer;
  inputs: SimulatorInputs;
  onInputChange: (key: keyof SimulatorInputs, value: number) => void;
}

type SaveStatus = { kind: 'idle' } | { kind: 'saved'; agrees: boolean };

export function Simulator({ customer, inputs, onInputChange }: SimulatorProps) {
  const plan = PLANS[customer.plan];
  const save = useCreateSimulation(customer.id);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  // Same pure function the server uses: instant feedback, no network round-trip per slider move.
  const quote = useMemo(
    () => computeQuote({ ...inputs, plan: customer.plan, countryCode: customer.countryCode }),
    [inputs, customer.plan, customer.countryCode],
  );

  function change(key: keyof SimulatorInputs, value: number): void {
    setStatus({ kind: 'idle' });
    onInputChange(key, value);
  }

  function handleSave(): void {
    save.mutate(
      { customerId: customer.id, ...inputs },
      {
        onSuccess: (simulation) =>
          setStatus({ kind: 'saved', agrees: serverAgreesWithClient(simulation, customer.plan, customer.countryCode) }),
      },
    );
  }

  return (
    <section className={styles.card} aria-labelledby="simulator-title">
      <header className={styles.header}>
        <h2 id="simulator-title" className={styles.title}>
          Simulador de factura
        </h2>
        <ProjectionSummary quote={quote} activeUsers={inputs.activeUsers} />
      </header>
      <UsageControls inputs={inputs} plan={plan} onChange={change} />
      <QuoteBreakdown quote={quote} plan={plan} />
      <footer className={styles.footer}>
        <SaveFeedback status={status} error={save.isError ? describeError(save.error) : undefined} />
        <Button onClick={handleSave} loading={save.isPending}>
          Guardar simulación
        </Button>
      </footer>
      <p className={styles.note}>
        Plan {plan.name} · {formatNumber(plan.includedStorageGb)} GB y {formatNumber(plan.includedApiCalls)} llamadas
        incluidas. El importe guardado lo recalcula siempre el servidor.
      </p>
    </section>
  );
}

function SaveFeedback({ status, error }: { status: SaveStatus; error: string | undefined }) {
  if (error) {
    return (
      <p className={styles.error} role="alert">
        No se pudo guardar: {error}
      </p>
    );
  }
  if (status.kind !== 'saved') return <span />;
  return status.agrees ? (
    <p className={styles.success} role="status">
      ✓ Simulación guardada en el historial
    </p>
  ) : (
    <p className={styles.error} role="alert">
      Guardada, pero el servidor calculó un importe distinto: recarga la página para usar la tarifa vigente.
    </p>
  );
}
