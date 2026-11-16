import { computeQuote, PLANS, QUOTE_LIMITS, type Customer } from '@saas/shared';
import { useMemo, useState } from 'react';
import { describeError } from '../../api/errors';
import { Button } from '../../components/Button';
import { RangeField } from '../../components/RangeField';
import { formatNumber } from '../../lib/format';
import { useCurrency } from '../currency/CurrencyContext';
import { BASE_DISPLAY, formatMoney, formatRate } from '../currency/formatMoney';
import { useMoneyFormatter } from '../currency/useMoneyFormatter';
import { serverAgreesWithClient, useCreateSimulation, type SimulatorInputs } from './hooks';
import { QuoteBreakdown } from './QuoteBreakdown';
import styles from './Simulator.module.css';

interface SimulatorProps {
  customer: Customer;
  inputs: SimulatorInputs;
  onInputChange: (key: keyof SimulatorInputs, value: number) => void;
}

type SaveStatus = { kind: 'idle' } | { kind: 'saved'; agrees: boolean };

export function Simulator({ customer, inputs, onInputChange }: SimulatorProps) {
  const money = useMoneyFormatter();
  const { display } = useCurrency();
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
        <p className={styles.projection}>
          <span className={styles.projectionLabel}>Proyección mensual</span>
          <strong data-testid="projected-total">{money(quote.totalCents)}</strong>
          <span className={styles.perUser}>
            ≈ {money(Math.round(quote.baseCents / inputs.activeUsers))} / usuario (sin IVA ni extras)
          </span>
          {display.currency !== BASE_DISPLAY.currency && (
            <span className={styles.perUser} data-testid="eur-equivalent">
              Se factura en EUR: {formatMoney(quote.totalCents)} · {formatRate(display)}
            </span>
          )}
        </p>
      </header>

      <div className={styles.controls}>
        <RangeField
          label="Usuarios activos"
          unit="usuarios"
          value={inputs.activeUsers}
          onChange={(value) => change('activeUsers', value)}
          {...QUOTE_LIMITS.activeUsers}
          sliderMax={500}
        />
        <RangeField
          label="Almacenamiento"
          unit="GB"
          value={inputs.storageGb}
          onChange={(value) => change('storageGb', value)}
          {...QUOTE_LIMITS.storageGb}
          sliderMax={plan.includedStorageGb * 4}
          step={10}
        />
        <RangeField
          label="Llamadas API / mes"
          unit="llamadas"
          value={inputs.apiCalls}
          onChange={(value) => change('apiCalls', value)}
          {...QUOTE_LIMITS.apiCalls}
          sliderMax={plan.includedApiCalls * 4}
          step={plan.includedApiCalls / 100}
        />
      </div>

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
