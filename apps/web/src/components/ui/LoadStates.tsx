import { RefreshCw } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Alert } from './Alert';
import { Button } from './Button';
import { Spinner } from './Spinner';

/** Shown while a section's data is loading. */
export function LoadingBlock({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cx('flex items-center justify-center gap-3 py-16 text-brand-indigo', className)}
    >
      <Spinner label={label} />
      <span className="text-sm font-medium text-slate-600" aria-hidden="true">
        {label}…
      </span>
    </div>
  );
}

/** Shown when a section's data couldn't be loaded, with a way to try again. */
export function LoadError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <Alert tone="error" title="This section couldn't be loaded" className={className}>
      <p>{message}</p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Try again
      </Button>
    </Alert>
  );
}
