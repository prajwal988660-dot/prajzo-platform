import type { FontId } from '@prajzo/shared';
import { useEffect } from 'react';

/**
 * Each typeface's file is downloaded only when a design uses it, so the main website stays
 * small. Inter and Sora are the website's own typefaces and are always there.
 */
const loaders: Record<FontId, (() => Promise<unknown>) | undefined> = {
  inter: undefined,
  sora: undefined,
  'bricolage-grotesque': () => import('./fonts/bricolage-grotesque.css'),
  figtree: () => import('./fonts/figtree.css'),
  fraunces: () => import('./fonts/fraunces.css'),
  manrope: () => import('./fonts/manrope.css'),
  'dm-serif-display': () => import('./fonts/dm-serif-display.css'),
  'dm-sans': () => import('./fonts/dm-sans.css'),
};

/** Loads the typefaces a design uses. A typeface that fails to load falls back to the system's. */
export function useFonts(...fonts: FontId[]): void {
  const key = fonts.join(',');
  useEffect(() => {
    for (const font of key.split(',') as FontId[]) void loaders[font]?.().catch(() => undefined);
  }, [key]);
}
