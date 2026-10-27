import { z } from 'zod';
import { hexColorSchema, idSchema, optionalSiteText, siteText } from './primitives';
import { sectionSchema } from './sections';

/**
 * One website design (architecture 5.1, D-004): the complete description of a site that the
 * live demos, the builder, its preview and the admin review all draw with the same renderer.
 */

export const CONFIG_SCHEMA_VERSION = 1;

export const templateKeys = ['portfolio', 'business', 'event', 'catalogue', 'forms'] as const;
export type TemplateKey = (typeof templateKeys)[number];

/**
 * Typefaces a design may use. Each is self-hosted (D-019), so adding one means adding its
 * font package to the web app as well as its id here.
 */
export const fontIds = ['inter', 'sora'] as const;
export type FontId = (typeof fontIds)[number];

export const buttonStyles = ['pill', 'rounded', 'square'] as const;
export const spacings = ['compact', 'comfortable', 'spacious'] as const;

export const colorRoles = ['primary', 'accent', 'background', 'surface', 'text'] as const;
export type ColorRole = (typeof colorRoles)[number];

export const designSchema = z.object({
  /** One of the template's colour themes; `colors` start from it and may then be changed. */
  theme: idSchema,
  colors: z.object({
    primary: hexColorSchema,
    accent: hexColorSchema,
    background: hexColorSchema,
    surface: hexColorSchema,
    text: hexColorSchema,
  }),
  fonts: z.object({ heading: z.enum(fontIds), body: z.enum(fontIds) }),
  buttonStyle: z.enum(buttonStyles),
  spacing: z.enum(spacings),
});

export const pageTypes = ['home', 'about', 'work', 'contact'] as const;
export type PageType = (typeof pageTypes)[number];

export const pageSchema = z.object({
  id: idSchema,
  type: z.enum(pageTypes),
  /** The navigation label and the page title. */
  title: siteText(40, 'A page title'),
  /** The page's address after the site's: "" for the home page, "work" for /work. */
  slug: z
    .string()
    .regex(
      /^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/,
      'Use lower-case letters and numbers, joined by dashes',
    )
    .max(40),
  enabled: z.boolean(),
  showInNav: z.boolean(),
  sections: z.array(sectionSchema).min(1).max(20),
});

export const socialNetworks = [
  'linkedin',
  'github',
  'instagram',
  'x',
  'facebook',
  'youtube',
  'behance',
  'dribbble',
] as const;

/** Each network's own addresses only, so a "LinkedIn" link can't lead somewhere else. */
const socialHosts: Record<(typeof socialNetworks)[number], RegExp> = {
  linkedin: /^(?:[\w-]+\.)?linkedin\.com$/,
  github: /^github\.com$/,
  instagram: /^(?:www\.)?instagram\.com$/,
  x: /^(?:www\.)?(?:x|twitter)\.com$/,
  facebook: /^(?:www\.|m\.)?facebook\.com$/,
  youtube: /^(?:www\.)?(?:youtube\.com|youtu\.be)$/,
  behance: /^(?:www\.)?behance\.net$/,
  dribbble: /^(?:www\.)?dribbble\.com$/,
};

export const socialLinkSchema = z
  .object({ network: z.enum(socialNetworks), url: z.string().trim().max(300) })
  .refine(
    ({ network, url }) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && socialHosts[network].test(parsed.hostname);
      } catch {
        return false;
      }
    },
    { message: 'Use the full https:// address of this profile', path: ['url'] },
  );

export const siteContactSchema = z.object({
  email: z.email('Use an email address like name@example.com').max(200).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, 'Use digits, spaces or +')
    .optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, 'Use digits, spaces or +')
    .optional(),
  location: optionalSiteText(100),
});

export const websiteConfigSchema = z.object({
  schemaVersion: z.literal(CONFIG_SCHEMA_VERSION),
  template: z.object({ key: z.enum(templateKeys), version: z.number().int().min(1) }),
  site: z.object({
    name: siteText(60, 'The site name'),
    tagline: optionalSiteText(120),
    /** The browser tab and search results description. */
    description: optionalSiteText(200),
  }),
  design: designSchema,
  pages: z.array(pageSchema).min(1).max(10),
  contact: siteContactSchema,
  social: z.array(socialLinkSchema).max(8).default([]),
});

export type WebsiteConfig = z.infer<typeof websiteConfigSchema>;
export type WebsiteConfigInput = z.input<typeof websiteConfigSchema>;
export type SitePage = z.infer<typeof pageSchema>;
export type SiteDesign = z.infer<typeof designSchema>;
