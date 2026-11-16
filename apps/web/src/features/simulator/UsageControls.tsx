import { QUOTE_LIMITS, type PlanInfo } from '@saas/shared';
import { RangeField } from '../../components/RangeField';
import type { SimulatorInputs } from './hooks';
import styles from './Simulator.module.css';

interface UsageControlsProps {
  inputs: SimulatorInputs;
  plan: PlanInfo;
  onChange: (key: keyof SimulatorInputs, value: number) => void;
}

/** Sliders cover the common range (scaled to the plan allowance); larger values are typed. */
export function UsageControls({ inputs, plan, onChange }: UsageControlsProps) {
  return (
    <div className={styles.controls}>
      <RangeField
        label="Usuarios activos"
        unit="usuarios"
        value={inputs.activeUsers}
        onChange={(value) => onChange('activeUsers', value)}
        {...QUOTE_LIMITS.activeUsers}
        sliderMax={500}
      />
      <RangeField
        label="Almacenamiento"
        unit="GB"
        value={inputs.storageGb}
        onChange={(value) => onChange('storageGb', value)}
        {...QUOTE_LIMITS.storageGb}
        sliderMax={plan.includedStorageGb * 4}
        step={10}
      />
      <RangeField
        label="Llamadas API / mes"
        unit="llamadas"
        value={inputs.apiCalls}
        onChange={(value) => onChange('apiCalls', value)}
        {...QUOTE_LIMITS.apiCalls}
        sliderMax={plan.includedApiCalls * 4}
        step={plan.includedApiCalls / 100}
      />
    </div>
  );
}
