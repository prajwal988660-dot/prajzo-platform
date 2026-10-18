import { cx } from '../../lib/cx';

const sizes = { sm: 'size-4', md: 'size-6', lg: 'size-8' } as const;

type SpinnerProps = {
  /** Announced to screen readers. Pass `null` when the surrounding control already says it's busy. */
  label?: string | null;
  size?: keyof typeof sizes;
  className?: string;
};

export function Spinner({ label = 'Loading', size = 'md', className }: SpinnerProps) {
  const icon = (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cx('animate-spin', sizes[size])}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M21.5 12A9.5 9.5 0 0 0 12 2.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );

  if (label === null) return <span className={cx('inline-flex', className)}>{icon}</span>;

  return (
    <span role="status" className={cx('inline-flex items-center', className)}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
