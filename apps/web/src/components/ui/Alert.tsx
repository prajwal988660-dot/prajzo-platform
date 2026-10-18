import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const tones: Record<AlertTone, { icon: LucideIcon; box: string; iconColor: string }> = {
  info: { icon: Info, box: 'border-sky-200 bg-sky-50 text-sky-950', iconColor: 'text-sky-700' },
  success: {
    icon: CircleCheck,
    box: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    iconColor: 'text-emerald-700',
  },
  warning: {
    icon: TriangleAlert,
    box: 'border-amber-200 bg-amber-50 text-amber-950',
    iconColor: 'text-amber-700',
  },
  error: {
    icon: CircleAlert,
    box: 'border-rose-200 bg-rose-50 text-rose-950',
    iconColor: 'text-rose-700',
  },
};

type AlertProps = { tone?: AlertTone; title?: ReactNode; children?: ReactNode; className?: string };

/** A message box. Errors are announced immediately (role="alert"); other tones politely. */
export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { icon: Icon, box, iconColor } = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('flex gap-3 rounded-xl border p-4 text-sm', box, className)}
    >
      <Icon aria-hidden="true" className={cx('mt-0.5 size-5 shrink-0', iconColor)} />
      <div className="grid gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
