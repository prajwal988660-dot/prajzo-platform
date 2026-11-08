import { z } from 'zod';
import { idSchema, imageSchema, linkSchema, optionalSiteText, siteText } from './primitives';

/**
 * What each kind of section holds (architecture 5.1). Section types are shared by every
 * template; a template lists which ones it uses and how many items each may have. Later demos
 * add their own types here (services, gallery, schedule, products, form…).
 */

/** Small pictures a service can have (drawn by the website; no uploads needed). */
export const serviceIcons = [
  'sparkles',
  'sign',
  'card',
  'banner',
  'printer',
  'brush',
  'truck',
  'clock',
  'shield',
  'star',
  'phone',
  'leaf',
] as const;
export type ServiceIcon = (typeof serviceIcons)[number];

/** Small pictures for an event's key facts. */
export const factIcons = ['calendar', 'clock', 'map', 'ticket', 'users', 'trophy'] as const;
export type FactIcon = (typeof factIcons)[number];

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
    /** A few big numbers under the buttons, such as "12 yrs" in business (Business). */
    stats: z
      .array(item({ value: siteText(16, 'A number'), label: siteText(40, 'A label') }))
      .max(4)
      .default([]),
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
  services: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    items: z
      .array(
        item({
          title: siteText(60, 'A service'),
          description: siteText(300, 'A description'),
          /** Shown as written, such as "From ₹2,500". */
          priceNote: optionalSiteText(40),
          icon: z.enum(serviceIcons).default('sparkles'),
        }),
      )
      .min(1),
  }),
  highlights: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    items: z.array(item({ title: siteText(50, 'A title'), text: siteText(160, 'A line') })).min(1),
  }),
  gallery: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    items: z.array(item({ image: imageSchema, caption: optionalSiteText(80) })).min(1),
  }),
  /** Customers' words. On a live demo they are always labelled as sample content (D-014). */
  testimonials: z.object({
    heading: siteText(80, 'The heading'),
    items: z
      .array(
        item({
          quote: siteText(400, 'A quote'),
          name: siteText(60, 'A name'),
          role: optionalSiteText(60),
        }),
      )
      .min(1),
  }),
  cta: z.object({
    heading: siteText(100, 'The heading'),
    text: optionalSiteText(240),
    action: linkSchema,
  }),
  /** Key facts in cards: date, time, venue… (Event, Phase 11). */
  facts: z.object({
    heading: optionalSiteText(80),
    items: z
      .array(
        item({
          label: siteText(30, 'A label'),
          value: siteText(80, 'A value'),
          icon: z.enum(factIcons).default('calendar'),
        }),
      )
      .min(1),
  }),
  schedule: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    days: z
      .array(
        item({
          name: siteText(60, 'A day'),
          slots: z
            .array(
              item({
                time: siteText(20, 'A time'),
                title: siteText(80, 'What happens'),
                place: optionalSiteText(60),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
  }),
  guidelines: z.object({
    heading: siteText(80, 'The heading'),
    items: z.array(item({ text: siteText(240, 'A guideline') })).min(1),
  }),
  /**
   * A registration form. Each registration is saved; on a live demo it goes to the demo inbox
   * (D-014). People choose one of `events`.
   */
  registration: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    eventLabel: siteText(30, 'The label'),
    events: z
      .array(siteText(60, 'An event'))
      .min(1, 'List at least one thing people can register for')
      .max(20),
    askPhone: z.boolean(),
    askOrganisation: z.boolean(),
    organisationLabel: siteText(30, 'The label'),
    closingNote: optionalSiteText(200),
  }),
  /**
   * Products with categories people can filter by (Catalogue, Phase 12). There is no checkout:
   * people ask about a product, by the enquiry form or on WhatsApp.
   */
  products: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    showFilters: z.boolean(),
    items: z
      .array(
        item({
          name: siteText(60, 'A product name'),
          category: siteText(30, 'A category'),
          priceNote: optionalSiteText(40),
          summary: siteText(200, 'A short description'),
          details: z.array(siteText(120, 'A detail')).max(6).default([]),
          image: imageSchema,
        }),
      )
      .min(1),
  }),
  /** An enquiry form whose product list comes from the products on the same page. */
  enquiry: z.object({
    heading: siteText(80, 'The heading'),
    intro: optionalSiteText(300),
    askPhone: z.boolean(),
    askQuantity: z.boolean(),
    closingNote: optionalSiteText(200),
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
  sectionOf('services'),
  sectionOf('highlights'),
  sectionOf('gallery'),
  sectionOf('testimonials'),
  sectionOf('cta'),
  sectionOf('facts'),
  sectionOf('schedule'),
  sectionOf('guidelines'),
  sectionOf('registration'),
  sectionOf('products'),
  sectionOf('enquiry'),
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
    case 'services':
    case 'highlights':
    case 'gallery':
    case 'testimonials':
    case 'facts':
    case 'guidelines':
      return section.content.items.length;
    case 'schedule':
      return section.content.days.reduce((sum, day) => sum + day.slots.length, 0);
    case 'registration':
      return section.content.events.length;
    case 'products':
      return section.content.items.length;
    case 'about':
      return section.content.facts.length;
    default:
      return 0;
  }
}
