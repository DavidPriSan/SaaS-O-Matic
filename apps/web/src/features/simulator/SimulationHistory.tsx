import type { Simulation } from '@saas/shared';
import { describeError } from '../../api/errors';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, SkeletonGrid } from '../../components/StatusViews';
import { formatDateTime, formatNumber } from '../../lib/format';
import { useMoneyFormatter } from '../currency/useMoneyFormatter';
import { useSimulations, type SimulatorInputs } from './hooks';
import styles from './SimulationHistory.module.css';

interface SimulationHistoryProps {
  customerId: number;
  onLoad: (inputs: SimulatorInputs) => void;
}

export function SimulationHistory({ customerId, onLoad }: SimulationHistoryProps) {
  const simulations = useSimulations(customerId);

  return (
    <section className={styles.card} aria-labelledby="history-title">
      <h2 id="history-title" className={styles.title}>
        Historial de simulaciones
        {simulations.data && simulations.data.length > 0 && (
          <span className={styles.count}> ({simulations.data.length})</span>
        )}
      </h2>
      {simulations.isPending ? (
        <SkeletonGrid count={2} />
      ) : simulations.isError ? (
        <ErrorState message={describeError(simulations.error)} onRetry={() => void simulations.refetch()} />
      ) : simulations.data.length === 0 ? (
        <EmptyState
          title="Sin simulaciones guardadas"
          description="Ajusta el simulador y pulsa «Guardar simulación» para registrar una propuesta."
        />
      ) : (
        <ol className={styles.list}>
          {simulations.data.map((simulation) => (
            <HistoryItem key={simulation.id} simulation={simulation} onLoad={onLoad} />
          ))}
        </ol>
      )}
    </section>
  );
}

function HistoryItem({ simulation, onLoad }: { simulation: Simulation; onLoad: SimulationHistoryProps['onLoad'] }) {
  const money = useMoneyFormatter();
  const { activeUsers, storageGb, apiCalls } = simulation;

  return (
    <li className={styles.item}>
      <div className={styles.info}>
        <time dateTime={simulation.createdAt} className={styles.date}>
          {formatDateTime(simulation.createdAt)}
        </time>
        <span className={styles.usage}>
          {formatNumber(activeUsers)} usuarios · {formatNumber(storageGb)} GB · {formatNumber(apiCalls)} llamadas
        </span>
      </div>
      <div className={styles.side}>
        <strong className={styles.total}>{money(simulation.quote.totalCents)}</strong>
        <Button
          variant="ghost"
          onClick={() => onLoad({ activeUsers, storageGb, apiCalls })}
          aria-label={`Cargar en el simulador la simulación del ${formatDateTime(simulation.createdAt)}`}
        >
          Cargar
        </Button>
      </div>
    </li>
  );
}
