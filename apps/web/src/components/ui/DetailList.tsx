import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

/** A list of facts, each a small heading and its answer ("Type of website: Business Websites"). */
export function DetailList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cx('mt-2', className)}>{children}</dl>;
}

export function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-4 sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-4">
      <dt className="text-sm font-medium text-slate-600">{term}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}
