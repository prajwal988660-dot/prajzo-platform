import { websiteConfigSchema, type TemplateKey, type WebsiteConfig } from '@prajzo/shared';

/**
 * A visitor who isn't signed in keeps their design in this browser only (Phase 9). It never
 * leaves the browser until they create an account and save it. Browser storage can be missing or
 * full (private windows, blocked site data), so every read and write is allowed to fail quietly.
 */
const keyFor = (template: TemplateKey) => `prajzo.builder.draft.${template}`;

export function readDraft(template: TemplateKey): WebsiteConfig | null {
  try {
    const text = window.localStorage.getItem(keyFor(template));
    if (!text) return null;
    const parsed = websiteConfigSchema.safeParse(JSON.parse(text));
    return parsed.success && parsed.data.template.key === template ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeDraft(config: WebsiteConfig): void {
  try {
    window.localStorage.setItem(keyFor(config.template.key), JSON.stringify(config));
  } catch {
    // Nothing to do: the design is still on screen.
  }
}

export function clearDraft(template: TemplateKey): void {
  try {
    window.localStorage.removeItem(keyFor(template));
  } catch {
    // Nothing to do.
  }
}
