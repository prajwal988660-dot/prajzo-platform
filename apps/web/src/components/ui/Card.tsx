import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';

type CardProps = ComponentProps<'div'> & {
  /** Lifts slightly on hover; use when the whole card is clickable. */
  interactive?: boolean;
};

export function Card({ interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card',
        interactive && 'transition duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
      {...props}
    />
  );
}
