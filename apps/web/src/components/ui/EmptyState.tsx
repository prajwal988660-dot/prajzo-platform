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
  /**
   * Which heading the title is. Use 1 when this is all the page has to say ("not found"), 2 when
   * it sits directly under the page's title, and 3 (the default) inside a section with a heading.
   */
  headingLevel?: 1 | 2 | 3;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
  headingLevel = 3,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
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
      <Heading className="mt-4 text-lg font-semibold">{title}</Heading>
      {description && <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
