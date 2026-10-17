import { Link } from 'react-router';
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
      <img
        src="/brand/prajzo-logo.png"
        alt="Prajzo home"
        width={800}
        height={147}
        className="h-7 w-auto"
      />
    </Link>
  );
}
