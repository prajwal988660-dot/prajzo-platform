import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { buttonClasses } from './Button';

/**
 * When the visitor uses "Previous" or "Next", the list below is replaced. Keyboard focus is then
 * moved to the new list, so they can carry on from its first item and a screen reader says what
 * is there. The list is the element just above the page links. This is remembered for a few
 * seconds, and only for the page it happened on, because the page links may be taken off the
 * screen while the next page loads.
 */
let paging: { pathname: string; at: number } | null = null;
const HOW_LONG_TO_WAIT_MS = 8000;

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
  const { pathname } = useLocation();
  const links = useRef<HTMLElement>(null);

  useEffect(() => {
    if (paging?.pathname !== pathname || Date.now() - paging.at > HOW_LONG_TO_WAIT_MS) return;
    const list = links.current?.previousElementSibling;
    if (!(list instanceof HTMLElement)) return;
    paging = null;
    if (!list.hasAttribute('tabindex')) list.setAttribute('tabindex', '-1');
    // The router has already scrolled to the top of the new page; don't scroll again.
    list.focus({ preventScroll: true });
  }, [page, pathname]);

  if (totalPages <= 1) return null;

  const to = (target: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(target));
    return `?${next.toString()}`;
  };

  return (
    <nav ref={links} aria-label={label} className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link
          to={to(page - 1)}
          onClick={() => (paging = { pathname, at: Date.now() })}
          className={buttonClasses({ variant: 'secondary' })}
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </p>
      {page < totalPages ? (
        <Link
          to={to(page + 1)}
          onClick={() => (paging = { pathname, at: Date.now() })}
          className={buttonClasses({ variant: 'secondary' })}
        >
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
