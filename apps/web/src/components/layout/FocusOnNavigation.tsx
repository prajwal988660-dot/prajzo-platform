import { useEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';

/**
 * After a visitor moves to another page of the app, puts keyboard focus (and what a screen reader
 * reads) at the top of the new page, on its main heading. Without this, focus stays on the link
 * that was used, in the header, and the page "changes" silently: a keyboard user has to tab back
 * through the whole header to reach the content, and a screen reader says nothing about the move.
 *
 * It does nothing:
 * - for the first page of a visit (the browser handles that),
 * - going Back or Forward (a "POP"): ScrollMemory returns the visitor to where they were on that
 *   page, so moving focus to the heading would scroll the page back to the top and undo that,
 * - when only the search or the page number of the same page changes: a filter box or a "Next"
 *   link keeps its own focus (see Pagination),
 * - when the new page has already put focus inside its content by itself.
 */
export function FocusOnNavigation() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const shown = useRef(pathname);

  useEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    // Back/Forward returns to a page the visitor already saw, at the place they left it.
    if (navigationType === NavigationType.Pop) return;

    const main = document.getElementById('main');
    if (main?.contains(document.activeElement) && document.activeElement !== main) return;

    const target = main?.querySelector<HTMLElement>('h1') ?? main;
    if (!target) return;
    // A heading is not normally focusable; this makes it focusable by script only (not by Tab).
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    // ScrollMemory has already placed the page (at the top, for a new page), so don't scroll here.
    target.focus({ preventScroll: true });
  }, [pathname, navigationType]);

  return null;
}
