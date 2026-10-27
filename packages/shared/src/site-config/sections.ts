import { z } from 'zod';
import { idSchema, imageSchema, linkSchema, optionalSiteText, siteText } from './primitives';

/**
 * What each kind of section holds (architecture 5.1). Section types are shared by every
 * template; a template lists which ones it uses and how many items each may have. Later demos
 * add their own types here (services, gallery, schedule, products, form…).
 */

const item = <T extends z.ZodRawShape>(shape: T) => z.object({ id: idSchema, ...shape });

/** A period such as "2021" or "Mar 2021", and "Present" for one still going on. */
const period = z.object({
  start: siteText(20, 'The start'),
  end: optionalSiteText(20),
});

export const sectionContentSchemas = {
  header: z.object({
    /** Shown instead of a logo. Defaults to the site name. */
    brandText: optionalSiteText(40),
    action: linkSchema.optional(),
  }),
  hero: z.object({
    eyebrow: optionalSiteText(60),
    heading: siteText(120, 'The heading'),
    subheading: optionalSiteText(300),
    primaryAction: linkSchema.optional(),
    secondaryAction: linkSchema.optional(),
    image: imageSchema.optional(),
  }),
  about: z.object({
    heading: siteText(80, 'The heading'),
    paragraphs: z.array(siteText(800, 'A paragraph')).min(1).max(6),
    image: imageSchema.optional(),
    facts: z
      .array(item({ label: siteText(30, 'A label'), value: siteText(40, 'A value') }))
      .max(6)
      .default([]),
  }),
  skills: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    groups: z
      .array(
        item({
          name: siteText(40, 'A group name'),
          skills: z
            .array(
              item({
                name: siteText(40, 'A skill'),
                /** 1 to 5, shown only by layouts that show levels. */
                level: z.number().int().min(1).max(5).optional(),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
  }),
  projects: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    items: z
      .array(
        item({
          title: siteText(80, 'A project title'),
          summary: siteText(400, 'A summary'),
          tags: z.array(siteText(24, 'A tag')).max(6).default([]),
          image: imageSchema.optional(),
          link: linkSchema.optional(),
        }),
      )
      .min(1),
  }),
  experience: z.object({
    heading: siteText(80, 'The heading'),
    items: z
      .array(
        item({
          role: siteText(80, 'A role'),
          organisation: siteText(80, 'An organisation'),
          location: optionalSiteText(60),
          ...period.shape,
          summary: optionalSiteText(500),
        }),
      )
      .min(1),
  }),
  education: z.object({
    heading: siteText(80, 'The heading'),
    items: z
      .array(
        item({
          qualification: siteText(100, 'A qualification'),
          institution: siteText(100, 'An institution'),
          ...period.shape,
          summary: optionalSiteText(400),
        }),
      )
      .min(1),
  }),
  contact: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    /** The contact form: name, email and message. Its messages go to the site's owner. */
    showForm: z.boolean(),
    /** Shows the email, phone and WhatsApp from the site's contact details. */
    showDetails: z.boolean(),
  }),
  footer: z.object({
    text: optionalSiteText(160),
    showSocial: z.boolean(),
  }),
} as const;

export type SectionType = keyof typeof sectionContentSchemas;
export const sectionTypes = Object.keys(sectionContentSchemas) as SectionType[];

/** Where a section's picture sits, for layouts that offer a choice. */
export const imagePositions = ['left', 'right', 'top', 'background'] as const;

const sectionBase = {
  id: idSchema,
  variant: idSchema,
  enabled: z.boolean(),
  layout: z.object({ imagePosition: z.enum(imagePositions).optional() }).optional(),
};

const sectionOf = <T extends SectionType>(type: T) =>
  z.object({ ...sectionBase, type: z.literal(type), content: sectionContentSchemas[type] });

/** One section: its type decides the shape of its content. */
export const sectionSchema = z.discriminatedUnion('type', [
  sectionOf('header'),
  sectionOf('hero'),
  sectionOf('about'),
  sectionOf('skills'),
  sectionOf('projects'),
  sectionOf('experience'),
  sectionOf('education'),
  sectionOf('contact'),
  sectionOf('footer'),
]);

export type SectionContent<T extends SectionType> = z.infer<(typeof sectionContentSchemas)[T]>;
export type Section = z.infer<typeof sectionSchema>;
/** What a section looks like before cleaning (as typed into the builder). */
export type SectionInput = z.input<typeof sectionSchema>;

/** How many list items a section holds, for the template's limits. */
export function itemCount(section: Section): number {
  switch (section.type) {
    case 'skills':
      return section.content.groups.reduce((sum, group) => sum + group.skills.length, 0);
    case 'projects':
    case 'experience':
    case 'education':
      return section.content.items.length;
    case 'about':
      return section.content.facts.length;
    default:
      return 0;
  }
}
