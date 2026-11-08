import { useEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';

/**
 * Scroll behaviour between pages. It replaces React Router's own ScrollRestoration because some
 * pages (the home page especially) finish loading parts of themselves after they first appear, so
 * the page is shorter at the moment of a Back than it is a moment later. React Router restores the
 * scroll once, against that shorter page, and the visitor is left part way up.
 *
 * This remembers where each page was left, and on Back or Forward it puts the visitor back there
 * and keeps doing so for a short while as late content makes the page taller, until the page can
 * actually reach the saved place. A new page (a link, a button) starts at the top, as expected.
 */
export function ScrollMemory() {
  const { key } = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  // The page currently on screen. A plain scroll listener always saves against this, so the
  // position is kept under the right key even as the listener keeps firing during a page change.
  const current = useRef(key);

  // True from the moment a link or button is pressed until the new page has settled: during that
  // window the old page can briefly shrink (its sections unmount) and the browser clamps scrollY to
  // a smaller number. We must not save that clamped value over the real position the visitor left.
  const leaving = useRef(false);

  // Save the live position under whichever page is on screen. The scroll listener keeps it current
  // while the visitor reads; a capture-phase click/keydown listener takes the final reading the
  // instant they choose to leave, and then freezes saving so the shrink-clamp cannot overwrite it.
  useEffect(() => {
    const onScroll = () => {
      if (!leaving.current) positions.current.set(current.current, window.scrollY);
    };
    const onLeave = () => {
      positions.current.set(current.current, window.scrollY);
      leaving.current = true;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onLeave, { capture: true });
    document.addEventListener('keydown', onLeave, { capture: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onLeave, { capture: true });
      document.removeEventListener('keydown', onLeave, { capture: true });
    };
  }, []);

  // Let this component own scroll restoration, not the browser, so the two do not fight.
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    // The page on screen is now this one; the scroll listener saves against it, and is live again.
    const target = navigationType === NavigationType.Pop ? (positions.current.get(key) ?? 0) : 0;
    current.current = key;
    leaving.current = false;

    if (target === 0) {
      window.scrollTo(0, 0);
      return undefined;
    }
    // Returning to a page: aim for where it was left, and keep aiming as it grows taller, so
    // sections that load a moment later cannot strand the visitor part way up.
    let frame = 0;
    const start = performance.now();
    const settle = () => {
      if (Math.abs(window.scrollY - target) > 1) window.scrollTo(0, target);
      const settledOrDone =
        window.scrollY === target ||
        window.innerHeight + target <= document.documentElement.scrollHeight ||
        performance.now() - start > 1000;
      if (!settledOrDone) frame = requestAnimationFrame(settle);
    };
    frame = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(frame);
  }, [key, navigationType]);

  return null;
}
