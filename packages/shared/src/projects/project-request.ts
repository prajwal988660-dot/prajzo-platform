import { z } from 'zod';
import { isCalendarDate, todayInIndia } from '../dates';
import { paginatedSchema } from '../api/pagination';
import { optionalText, requiredText } from '../text';
import { projectStatusSchema } from './status';

/** Things a customer can ask for. The same list is shown in the form and checked by the server. */
export const projectFeatures = [
  'contact-form',
  'whatsapp-button',
  'gallery',
  'blog',
  'online-booking',
  'product-catalogue',
  'user-accounts',
  'admin-panel',
  'multi-language',
  'seo-setup',
] as const;
export type ProjectFeature = (typeof projectFeatures)[number];

export const projectFeatureLabels: Record<ProjectFeature, string> = {
  'contact-form': 'Contact or enquiry form',
  'whatsapp-button': 'WhatsApp chat button',
  gallery: 'Photo or video gallery',
  blog: 'Blog or news section',
  'online-booking': 'Online booking or appointments',
  'product-catalogue': 'Product catalogue',
  'user-accounts': 'Customer sign-in',
  'admin-panel': 'Admin panel to edit content',
  'multi-language': 'More than one language',
  'seo-setup': 'Search-engine setup (SEO)',
};

/** Outside services a project may need to connect to. */
export const projectIntegrations = [
  'google-maps',
  'google-analytics',
  'payment-gateway',
  'email-newsletter',
  'social-feeds',
] as const;
export type ProjectIntegration = (typeof projectIntegrations)[number];

export const projectIntegrationLabels: Record<ProjectIntegration, string> = {
  'google-maps': 'Google Maps',
  'google-analytics': 'Google Analytics',
  'payment-gateway': 'Online payments (for example Razorpay)',
  'email-newsletter': 'Email newsletter sign-up',
  'social-feeds': 'Social media feeds (Instagram, YouTube)',
};

export const contactPreferences = ['email', 'phone', 'whatsapp'] as const;
export type ContactPreference = (typeof contactPreferences)[number];

export const contactPreferenceLabels: Record<ContactPreference, string> = {
  email: 'Email',
  phone: 'Phone call',
  whatsapp: 'WhatsApp',
};

/**
 * The Start a Project form. The same rules run in the browser (instant feedback) and on the
 * server (which never trusts the browser). Fields that are not listed here, such as a status,
 * a price or a delivery date, are dropped: a customer can't set them.
 */
export const projectRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Give your project a short name (at least 3 characters)')
      .max(100, 'Keep the name under 100 characters'),
    /** Category key from the service catalogue, or "other". */
    categoryKey: z.string().trim().min(1, 'Choose the type of website you need').max(60),
    /** Package key, or "not-sure". */
    packageKey: optionalText(60),
    description: z
      .string()
      .trim()
      .min(30, 'Tell us a little more (at least 30 characters)')
      .max(3000, 'Keep the description under 3,000 characters'),
    features: z.array(z.enum(projectFeatures)).max(projectFeatures.length).default([]),
    integrations: z.array(z.enum(projectIntegrations)).max(projectIntegrations.length).default([]),
    /** A date the customer would like, as YYYY-MM-DD. A wish, not a commitment. */
    preferredDate: optionalText(10)
      .refine(
        (value) => value === undefined || isCalendarDate(value),
        'Choose a date from the calendar',
      )
      .refine(
        (value) => value === undefined || !isCalendarDate(value) || value >= todayInIndia(),
        "Choose a date that hasn't passed",
      ),
    contactPreference: z.enum(contactPreferences).default('email'),
    phone: optionalText(30).refine(
      (value) => value === undefined || /^\+?[0-9 ()-]{7,20}$/.test(value),
      'Enter a phone number using digits, spaces or +',
    ),
    notes: optionalText(1000),
  })
  .refine((value) => value.contactPreference === 'email' || value.phone !== undefined, {
    path: ['phone'],
    error: 'Add a phone number so we can reach you that way',
    // Checked even while other fields have problems, so a person sees every problem at once. It
    // is skipped only when the phone number or the preference is itself invalid.
    when: (payload) =>
      !payload.issues.some(
        (issue) => issue.path?.[0] === 'phone' || issue.path?.[0] === 'contactPreference',
      ),
  });

/** What the form holds (before cleaning). */
export type ProjectRequestFormValues = z.input<typeof projectRequestSchema>;
/** What the server stores (after cleaning). */
export type ProjectRequest = z.output<typeof projectRequestSchema>;

/**
 * Sending a saved design as a project request (Phase 14). The design already says what the website
 * is, which pages it has and how it looks, so none of that is asked for again: only how to get in
 * touch, when it is wanted, and anything the customer wants to add. The title and the description
 * are written from the design by the server, so they cannot be forged.
 */
export const designSubmissionSchema = z
  .object({
    /** The saved design to send. Checked on the server: it must be the customer's own. */
    designId: z
      .string()
      .trim()
      .regex(/^[0-9a-f]{24}$/i, 'Choose one of your saved designs'),
    /** Which kind of website this is, from the catalogue, so it is quoted like any other. */
    categoryKey: z.string().trim().min(1, 'Choose the type of website you need').max(60),
    /** Package key, or "not-sure". */
    packageKey: optionalText(60),
    preferredDate: optionalText(10)
      .refine(
        (value) => value === undefined || isCalendarDate(value),
        'Choose a date from the calendar',
      )
      .refine(
        (value) => value === undefined || !isCalendarDate(value) || value >= todayInIndia(),
        "Choose a date that hasn't passed",
      ),
    contactPreference: z.enum(contactPreferences).default('email'),
    phone: optionalText(30).refine(
      (value) => value === undefined || /^\+?[0-9 ()-]{7,20}$/.test(value),
      'Enter a phone number using digits, spaces or +',
    ),
    notes: optionalText(1000),
  })
  .refine((value) => value.contactPreference === 'email' || value.phone !== undefined, {
    path: ['phone'],
    error: 'Add a phone number so we can reach you that way',
    when: (payload) =>
      !payload.issues.some(
        (issue) => issue.path?.[0] === 'phone' || issue.path?.[0] === 'contactPreference',
      ),
  });

/** What the review step holds (before cleaning). */
export type DesignSubmissionFormValues = z.input<typeof designSubmissionSchema>;
/** What the server stores (after cleaning). */
export type DesignSubmission = z.output<typeof designSubmissionSchema>;

/** What a customer may do to a project right now. The server decides, so no rule is repeated in the app. */
export const projectActions = [
  'cancel',
  'accept-quote',
  'decline-quote',
  'reply',
  'request-revision',
  'sign-off',
] as const;
export type ProjectAction = (typeof projectActions)[number];

/** A customer's answer to a question from Prajzo. */
export const replyMessageSchema = requiredText(
  2,
  2000,
  'Write your answer',
  'Keep your answer under 2,000 characters',
);

/** What a customer wants changed when they ask for a revision. */
export const revisionMessageSchema = requiredText(
  5,
  1500,
  "Tell us what you'd like changed (at least 5 characters)",
  'Keep this under 1,500 characters',
);

/** POST /project-requests/:reference/actions: one shape for each thing a customer can do. */
export const projectActionRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel'), note: optionalText(500) }),
  /** `quoteVersion` is the quote the customer was looking at, so a quote that changed meanwhile isn't accepted by mistake. */
  z.object({ action: z.literal('accept-quote'), quoteVersion: z.number().int().min(1) }),
  z.object({
    action: z.literal('decline-quote'),
    quoteVersion: z.number().int().min(1),
    note: optionalText(500),
  }),
  z.object({ action: z.literal('reply'), message: replyMessageSchema }),
  z.object({ action: z.literal('request-revision'), message: revisionMessageSchema }),
  z.object({ action: z.literal('sign-off') }),
]);
export type ProjectActionRequest = z.output<typeof projectActionRequestSchema>;
export type ProjectActionFormValues = z.input<typeof projectActionRequestSchema>;

export const projectReferencePattern = /^PRZ-\d{4}-\d{4,}$/;

const actors = z.enum(['customer', 'admin']);

/**
 * The kinds of entry in a project's timeline: a change of status (with the note that came with
 * it), the customer's answer to a question, a confirmed or changed delivery date, and the
 * customer saying the finished project looks good.
 */
export const timelineVariants = {
  status: z.object({
    kind: z.literal('status'),
    from: projectStatusSchema.nullable(),
    to: projectStatusSchema,
    by: actors,
    note: z.string().nullable(),
    at: z.string(),
  }),
  reply: z.object({
    kind: z.literal('reply'),
    by: z.literal('customer'),
    text: z.string(),
    at: z.string(),
  }),
  deliveryDate: z.object({
    kind: z.literal('delivery-date'),
    by: z.literal('admin'),
    from: z.string().nullable(),
    to: z.string(),
    note: z.string().nullable(),
    at: z.string(),
  }),
  signOff: z.object({ kind: z.literal('sign-off'), by: z.literal('customer'), at: z.string() }),
};

export const timelineEntrySchema = z.discriminatedUnion('kind', [
  timelineVariants.status,
  timelineVariants.reply,
  timelineVariants.deliveryDate,
  timelineVariants.signOff,
]);
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

/** A project in a list. */
export const projectSummarySchema = z.object({
  reference: z.string(),
  title: z.string(),
  status: projectStatusSchema,
  categoryTitle: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

/** A quote as the customer sees it. Amounts are whole paise (1 rupee = 100 paise). */
export const quoteSchema = z.object({
  version: z.number().int().min(1),
  amountPaise: z.number().int().nonnegative(),
  /** What the price includes, in the admin's words. */
  scope: z.string(),
  revisionsIncluded: z.number().int().nonnegative(),
  sentAt: z.string(),
  /** True for the version the customer accepted. */
  accepted: z.boolean(),
});
export type Quote = z.infer<typeof quoteSchema>;

/** How many rounds of changes the accepted quote includes, and how many have been asked for. */
export const revisionsSchema = z.object({
  included: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
});
export type Revisions = z.infer<typeof revisionsSchema>;

/** A project, as its owner sees it. Internal notes and other people's data are never included. */
export const projectDetailSchema = projectSummarySchema.extend({
  categoryKey: z.string(),
  packageKey: z.string().nullable(),
  packageName: z.string().nullable(),
  description: z.string(),
  features: z.array(z.enum(projectFeatures)),
  integrations: z.array(z.enum(projectIntegrations)),
  preferredDate: z.string().nullable(),
  contactPreference: z.enum(contactPreferences),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  timeline: z.array(timelineEntrySchema),
  /** The quote to show: the accepted one, or the latest while it waits for an answer. */
  quote: quoteSchema.nullable(),
  /** A date Prajzo has confirmed (YYYY-MM-DD). Never a promise before it exists. */
  confirmedDeliveryDate: z.string().nullable(),
  revisions: revisionsSchema.nullable(),
  allowedActions: z.array(z.enum(projectActions)),
});
export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export const projectResponseSchema = z.object({ project: projectDetailSchema });
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export const projectListSchema = paginatedSchema(projectSummarySchema);
export type ProjectList = z.infer<typeof projectListSchema>;
