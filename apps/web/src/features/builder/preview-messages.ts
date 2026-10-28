import { websiteConfigSchema, type WebsiteConfig } from '@prajzo/shared';

/**
 * The messages between the builder and its preview frame (D-006). Both are pages of this same
 * website, and each side accepts messages only from this website's own address.
 */
export const PREVIEW_READY = 'prajzo:preview-ready';
export const PREVIEW_SHOW = 'prajzo:preview-show';

export type PreviewShowMessage = { type: typeof PREVIEW_SHOW; config: WebsiteConfig; page: string };

/** Reads a message the preview received; anything else (or from anywhere else) is ignored. */
export function readShowMessage(event: MessageEvent, origin: string): PreviewShowMessage | null {
  if (event.origin !== origin) return null;
  const data = event.data as { type?: unknown; config?: unknown; page?: unknown } | null;
  if (!data || data.type !== PREVIEW_SHOW) return null;
  // The structure is checked again here, so the preview never draws something malformed.
  const config = websiteConfigSchema.safeParse(data.config);
  if (!config.success) return null;
  return {
    type: PREVIEW_SHOW,
    config: config.data,
    page: typeof data.page === 'string' ? data.page : '',
  };
}
