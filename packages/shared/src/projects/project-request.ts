import { z } from 'zod';
import { isCalendarDate, todayInIndia } from '../dates';
import { paginatedSchema } from '../api/pagination';
import { projectStatusSchema } from './status';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

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

/** What a customer may do to a project right now. The server decides, so no rule is repeated in the app. */
export const projectActions = ['cancel'] as const;
export type ProjectAction = (typeof projectActions)[number];

/** POST /project-requests/:reference/actions */
export const projectActionRequestSchema = z.object({
  action: z.enum(projectActions),
  note: optionalText(500),
});
export type ProjectActionRequest = z.output<typeof projectActionRequestSchema>;
export type ProjectActionFormValues = z.input<typeof projectActionRequestSchema>;

export const projectReferencePattern = /^PRZ-\d{4}-\d{4,}$/;

/** One line of the status timeline. */
export const projectHistoryEntrySchema = z.object({
  from: projectStatusSchema.nullable(),
  to: projectStatusSchema,
  by: z.enum(['customer', 'admin']),
  note: z.string().nullable(),
  at: z.string(),
});
export type ProjectHistoryEntry = z.infer<typeof projectHistoryEntrySchema>;

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
  history: z.array(projectHistoryEntrySchema),
  allowedActions: z.array(z.enum(projectActions)),
});
export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export const projectResponseSchema = z.object({ project: projectDetailSchema });
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export const projectListSchema = paginatedSchema(projectSummarySchema);
export type ProjectList = z.infer<typeof projectListSchema>;
