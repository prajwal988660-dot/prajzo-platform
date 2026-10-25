import { Link, useSearchParams } from 'react-router';
import { buttonClasses } from './Button';

/**
 * "Previous / Page 2 of 5 / Next" for a list. The page number lives in the address (?page=2), and
 * everything else in the address (a filter, a search) is kept when moving between pages.
 */
export function Pagination({
  page,
  totalPages,
  label,
}: {
  page: number;
  totalPages: number;
  /** What the pages are of, read out to screen readers: "Pages of projects". */
  label: string;
}) {
  const [searchParams] = useSearchParams();
  if (totalPages <= 1) return null;

  const to = (target: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(target));
    return `?${next.toString()}`;
  };

  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link to={to(page - 1)} className={buttonClasses({ variant: 'secondary' })}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </p>
      {page < totalPages ? (
        <Link to={to(page + 1)} className={buttonClasses({ variant: 'secondary' })}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** The page number in the address, or 1 when it is missing or makes no sense. */
export function pageFromAddress(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
