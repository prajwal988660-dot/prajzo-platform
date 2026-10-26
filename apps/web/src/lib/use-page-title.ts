import { useEffect } from 'react';
import { fullTitle } from '@prajzo/shared';
import { applyUntitledPageHead } from './use-page-meta';

/**
 * Sets the browser tab title to "Title · Prajzo", for pages whose name isn't fixed (a project's
 * name) or that are private. Pages with a fixed address use `usePageMeta`, which also sets the
 * description and the canonical address.
 */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    applyUntitledPageHead(fullTitle(title));
  }, [title]);
}
