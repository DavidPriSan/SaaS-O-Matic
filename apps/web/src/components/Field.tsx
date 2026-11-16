import { useId, type ReactElement } from 'react';
import styles from './Field.module.css';

interface ControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
}

interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  success?: string | undefined;
  /** Render prop: receives the accessibility wiring for the input/select. */
  children: (control: ControlProps) => ReactElement;
}

export function Field({ label, hint, error, success, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? success ?? hint;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        ...(message ? { 'aria-describedby': messageId } : {}),
      })}
      {message && (
        <p id={messageId} className={error ? styles.error : success ? styles.success : styles.hint}>
          {message}
        </p>
      )}
    </div>
  );
}

export const inputClassName = styles.input;
