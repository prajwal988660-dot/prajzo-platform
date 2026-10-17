import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '../../lib/cx';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition duration-150 select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ' +
  'disabled:pointer-events-none disabled:opacity-55';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white shadow-sm hover:bg-ink-soft',
  brand:
    'bg-linear-to-r from-brand-indigo to-brand-violet text-white shadow-sm hover:brightness-110',
  secondary: 'border border-slate-300 bg-white text-ink hover:border-slate-400 hover:bg-slate-50',
  ghost: 'text-ink hover:bg-slate-100',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-12 px-7 text-base',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cx(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks clicks while an action is running. */
  loading?: boolean;
};

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner label={null} size="sm" />}
      {children}
    </button>
  );
}

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

/** A link that looks like a button, for navigation (use Button for actions). */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
