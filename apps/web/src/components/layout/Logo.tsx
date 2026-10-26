import { Link } from 'react-router';
import logoUrl from '../../assets/prajzo-logo.webp';
import { cx } from '../../lib/cx';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cx(
        'inline-flex shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue',
        className,
      )}
    >
      <img src={logoUrl} alt="Prajzo home" width={320} height={59} className="h-7 w-auto" />
    </Link>
  );
}
