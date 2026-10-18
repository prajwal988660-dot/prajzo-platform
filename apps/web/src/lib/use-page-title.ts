import { useEffect } from 'react';

/** Sets the browser tab title: "Title · Prajzo", or the default title when none is given. */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Prajzo` : 'Prajzo · Web development studio';
  }, [title]);
}
