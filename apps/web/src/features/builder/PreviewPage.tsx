import type { WebsiteConfig } from '@prajzo/shared';
import { useEffect, useState } from 'react';
import { useNoIndex } from '../../lib/use-no-index';
import { SiteRenderer } from '../../site-renderer/SiteRenderer';
import { PREVIEW_READY, readShowMessage } from './preview-messages';

/**
 * The builder's preview (/preview, D-006). The builder shows this page in a frame that is really
 * 390, 768 or 1280 px wide, and sends it the design as it changes. Forms here check what is typed
 * but never send (preview mode).
 */
export function PreviewPage() {
  useNoIndex();
  const [shown, setShown] = useState<{ config: WebsiteConfig; page: string } | null>(null);

  useEffect(() => {
    const origin = window.location.origin;
    const onMessage = (event: MessageEvent) => {
      const message = readShowMessage(event, origin);
      if (message) setShown({ config: message.config, page: message.page });
    };
    window.addEventListener('message', onMessage);
    // Tell the builder this page is listening (only if it is inside a frame of this website).
    if (window.parent !== window) window.parent.postMessage({ type: PREVIEW_READY }, origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    document.title = 'Preview · Prajzo';
  }, []);

  if (!shown) {
    return (
      <p className="p-8 text-center text-slate-600" role="status">
        The preview appears here as you build your website.
      </p>
    );
  }
  return <SiteRenderer config={shown.config} mode="preview" pageSlug={shown.page} />;
}
