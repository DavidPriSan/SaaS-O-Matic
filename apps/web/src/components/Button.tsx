import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

const className = (variant: Variant, extra?: string) => [styles.button, styles[variant], extra].filter(Boolean).join(' ');

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', loading = false, disabled, children, className: extra, ...rest }: ButtonProps) {
  return (
    <button {...rest} className={className(variant, extra)} disabled={disabled || loading} aria-busy={loading}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
}

export function ButtonLink({ variant = 'primary', className: extra, ...rest }: ButtonLinkProps) {
  return <Link {...rest} className={className(variant, typeof extra === 'string' ? extra : undefined)} />;
}
