import { useEffect } from 'react';
import { defaultDescription, fullTitle, sitePages, type SitePagePath } from '@prajzo/shared';
import { useNoIndex } from './use-no-index';

/** The tag in the head matching `selector`, made (with `create`) if the page doesn't have it yet. */
function headTag<T extends HTMLElement>(selector: string, create: () => T): T {
  const existing = document.head.querySelector<T>(selector);
  if (existing) return existing;
  const made = create();
  document.head.append(made);
  return made;
}

/** The public address the website is known by, learned from the page the server sent. */
let publicOrigin: string | undefined;
function websiteOrigin(): string {
  if (publicOrigin === undefined) {
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    publicOrigin = canonical ? new URL(canonical).origin : window.location.origin;
  }
  return publicOrigin;
}

/**
 * Brings the tab title, the description and the canonical address up to date when a visitor moves
 * to another page without the server being asked (the server writes them for the first page).
 * `canonicalPath` is null for pages that must not be listed.
 */
export function applyPageHead(head: {
  title: string;
  description: string;
  canonicalPath: string | null;
}): void {
  document.title = head.title;
  headTag('meta[name="description"]', () => {
    const tag = document.createElement('meta');
    tag.name = 'description';
    return tag;
  }).content = head.description;

  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (head.canonicalPath === null) {
    canonical?.remove();
  } else {
    // Read the public address before the first change, while it is still the server's.
    const origin = websiteOrigin();
    headTag<HTMLLinkElement>('link[rel="canonical"]', () => {
      const tag = document.createElement('link');
      tag.rel = 'canonical';
      return tag;
    }).href = new URL(head.canonicalPath, origin).href;
  }
}

/**
 * For the pages of the website that have a fixed address: sets the tab title, the description and
 * the canonical address from the shared table, the same one the server uses (D-053). Pages that
 * must stay out of search results are marked as such.
 */
export function usePageMeta(path: SitePagePath): void {
  const page = sitePages[path];
  const name = 'name' in page ? page.name : undefined;
  useNoIndex(!page.index);
  useEffect(() => {
    applyPageHead({
      title: fullTitle(name),
      description: page.description,
      canonicalPath: page.index ? path : null,
    });
  }, [name, page.description, page.index, path]);
}

/** The head of a page with no entry of its own in the table (private, or named by its content). */
export function applyUntitledPageHead(title: string): void {
  applyPageHead({ title, description: defaultDescription, canonicalPath: null });
}
