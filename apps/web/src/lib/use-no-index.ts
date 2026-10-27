import { useEffect } from 'react';

/**
 * Asks search engines not to list this page (account and admin pages are private). `enabled` is
 * for pages that are only sometimes private; it defaults to on.
 */
export function useNoIndex(enabled = true): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex, nofollow';
    document.head.append(tag);
    return () => tag.remove();
  }, [enabled]);
}
