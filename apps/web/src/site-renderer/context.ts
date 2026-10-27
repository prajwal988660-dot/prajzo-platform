import type { WebsiteConfig } from '@prajzo/shared';
import { createContext, useContext } from 'react';

/**
 * How a design is being shown (architecture 5.4):
 * - `demo`: a live demo. The form really sends to the demo inbox; email, phone, WhatsApp and
 *   social links show what would happen instead of contacting anyone (D-014).
 * - `preview`: the builder's preview. The form checks what is typed but never sends.
 * - `review`: an administrator looking at a submitted design. Nothing can be typed or sent.
 */
export type RenderMode = 'demo' | 'preview' | 'review';

export const SiteContext = createContext<{ config: WebsiteConfig; mode: RenderMode } | null>(null);

export function useSite() {
  const site = useContext(SiteContext);
  if (!site) throw new Error('A site section was drawn outside SiteRenderer');
  return site;
}
