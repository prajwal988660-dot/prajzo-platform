import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Usually one button that helps the user move on. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-white text-brand-indigo shadow-card">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
