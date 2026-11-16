import { useId, useState } from 'react';
import { formatNumber } from '../lib/format';
import styles from './RangeField.module.css';

interface RangeFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Absolute bounds accepted by the numeric input. */
  min: number;
  max: number;
  /** The slider covers the common range; larger values are typed. */
  sliderMax: number;
  step?: number;
  unit: string;
}

/**
 * Slider + numeric input kept in sync. While typing, the input holds a draft so the user can clear it
 * and type freely; only valid integers within bounds are committed to `value`.
 */
export function RangeField({ label, value, onChange, min, max, sliderMax, step = 1, unit }: RangeFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const draftIsValid = draft === null || isValidInteger(draft, min, max);

  function handleType(text: string): void {
    setDraft(text);
    if (isValidInteger(text, min, max)) onChange(Number(text));
  }

  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <div className={styles.inputWrap}>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            className={styles.number}
            min={min}
            max={max}
            step={1}
            value={shown}
            aria-invalid={!draftIsValid}
            onChange={(event) => handleType(event.target.value)}
            onBlur={() => setDraft(null)}
          />
          <span className={styles.unit}>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        className={styles.slider}
        aria-label={label}
        min={min}
        max={sliderMax}
        step={step}
        value={Math.min(value, sliderMax)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {!draftIsValid && (
        <p className={styles.error} role="alert">
          Introduce un número entero entre {formatNumber(min)} y {formatNumber(max)}.
        </p>
      )}
    </div>
  );
}

function isValidInteger(text: string, min: number, max: number): boolean {
  if (text.trim() === '') return false;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= min && value <= max;
}
