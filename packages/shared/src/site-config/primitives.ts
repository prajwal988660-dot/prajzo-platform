import { z } from 'zod';

/**
 * The small pieces every website configuration is made of (D-004). Everything here is checked
 * in the browser and again by the API, which never trusts the browser's copy.
 */

/** Short identifiers for pages, sections and list items: "hero", "project-3". */
export const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lower-case letters and numbers, joined by dashes')
  .max(40);

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a colour like #1f6feb')
  .transform((value) => value.toLowerCase());

/** Text shown on the site: trimmed, never empty, never longer than `max`. */
export const siteText = (max: number, label = 'This') =>
  z
    .string()
    .trim()
    .min(1, `${label} can't be empty`)
    .max(max, `Keep this under ${max.toLocaleString('en-US')} characters`);

export const optionalSiteText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max.toLocaleString('en-US')} characters`)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

/**
 * Where a link may go (architecture 5.3): web pages, email, phone, and places on the same page.
 * `javascript:`, `data:` and everything else are refused, so a design can never run a script.
 */
export function isSafeLink(href: string): boolean {
  if (/^#[A-Za-z][\w-]*$/.test(href)) return true;
  if (/^\/(?!\/)[\w\-./]*$/.test(href)) return true;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  if (url.protocol === 'https:' || url.protocol === 'http:') return Boolean(url.hostname);
  if (url.protocol === 'mailto:') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname);
  if (url.protocol === 'tel:')
    return /^\+?[0-9()\- ]{5,20}$/.test(decodeURIComponent(url.pathname));
  return false;
}

export const linkHrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(isSafeLink, 'Use a web address (https://…), an email (mailto:…) or a phone (tel:…)');

export const linkSchema = z.object({
  label: siteText(40, 'A button or link label'),
  href: linkHrefSchema,
});

/**
 * Images come from the site itself (bundled demo pictures, later uploads under /uploads) or from
 * an https address. Every image needs a description for people who can't see it; a purely
 * decorative image says so with an empty description and `decorative: true`.
 */
export const imageSrcSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (src) =>
      /^\/(?!\/)[\w\-./]+\.(?:webp|png|jpe?g|avif)$/i.test(src) || /^https:\/\/[^\s]+$/.test(src),
    'Use an image from this site or an https:// address',
  );

export const imageSchema = z
  .object({
    src: imageSrcSchema,
    alt: z.string().trim().max(200),
    decorative: z.boolean().optional(),
  })
  .refine((image) => image.decorative === true || image.alt.length > 0, {
    message: 'Describe the image for people who can’t see it',
    path: ['alt'],
  });

export type SiteLink = z.infer<typeof linkSchema>;
export type SiteImage = z.infer<typeof imageSchema>;
