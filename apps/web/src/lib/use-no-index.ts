import { useEffect } from 'react';

/** Asks search engines not to list this page (account and admin pages are private). */
export function useNoIndex(): void {
  useEffect(() => {
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex, nofollow';
    document.head.append(tag);
    return () => tag.remove();
  }, []);
}
