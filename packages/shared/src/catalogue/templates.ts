import { z } from 'zod';
import { paginatedSchema, paginationQuerySchema } from '../api/pagination';
import { templateKeys } from '../site-config/config';
import { keySchema, requiredText } from '../text';

/**
 * The template catalogue (D-005): what the Templates pages say about each template. The designs
 * live in code; administrators manage only this listing around them.
 */

export const templateEntrySchema = z.object({
  key: z.enum(templateKeys),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  /** Service catalogue category keys, with their names as they are now. */
  categories: z.array(z.object({ key: z.string(), title: z.string() })),
  /** What the template includes, one short line each. */
  features: z.array(z.string()),
  featured: z.boolean(),
  /** A picture of the live demo, made by `npm run demo:previews`. */
  previewImage: z.object({ src: z.string(), alt: z.string() }),
  /** Where the live demo is, such as /demo/portfolio. */
  demoPath: z.string(),
});
export type TemplateEntry = z.infer<typeof templateEntrySchema>;

/** GET /templates: published templates, featured first, then in the administrators' order. */
export const templateListResponseSchema = z.object({ items: z.array(templateEntrySchema) });
export type TemplateListResponse = z.infer<typeof templateListResponseSchema>;

/** GET /templates/:key */
export const templateResponseSchema = z.object({ template: templateEntrySchema });

// ---------- For administrators

export const adminTemplateEntrySchema = templateEntrySchema.extend({
  published: z.boolean(),
  order: z.number().int(),
  updatedAt: z.string(),
});
export type AdminTemplateEntry = z.infer<typeof adminTemplateEntrySchema>;

export const adminTemplateListSchema = z.object({ items: z.array(adminTemplateEntrySchema) });
export const adminTemplateResponseSchema = z.object({ template: adminTemplateEntrySchema });

/** PATCH /admin/templates/:key. The same rules check the admin form. */
export const adminTemplateInputSchema = z.object({
  name: requiredText(2, 40, 'Give the template a name'),
  tagline: requiredText(5, 90, 'Write a short line about the template'),
  description: requiredText(20, 600, 'Describe the template (at least 20 characters)'),
  categories: z
    .array(keySchema)
    .min(1, 'Choose at least one category')
    .max(4, 'Choose at most four categories'),
  features: z
    .array(requiredText(2, 80, 'A feature can’t be empty'))
    .min(1, 'List at least one feature')
    .max(8, 'List at most eight features'),
  featured: z.boolean(),
  published: z.boolean(),
  order: z.coerce.number().int().min(0, 'Use 0 or more').max(999, 'Use 999 or less'),
  previewAlt: requiredText(10, 200, 'Describe the preview picture for people who can’t see it'),
});
export type AdminTemplateInput = z.output<typeof adminTemplateInputSchema>;
export type AdminTemplateFormValues = z.input<typeof adminTemplateInputSchema>;

// ---------- The demo inbox (messages sent from the live demos' contact forms)

export const demoSubmissionStatuses = ['new', 'read'] as const;
export type DemoSubmissionStatus = (typeof demoSubmissionStatuses)[number];

export const adminDemoSubmissionSchema = z.object({
  id: z.string(),
  template: z.enum(templateKeys),
  name: z.string(),
  email: z.string(),
  message: z.string(),
  status: z.enum(demoSubmissionStatuses),
  createdAt: z.string(),
  /** When it will be deleted by itself (D-014). */
  expiresAt: z.string(),
});
export type AdminDemoSubmission = z.infer<typeof adminDemoSubmissionSchema>;

/** GET /admin/demo-submissions?status=&template=&page=&limit= */
export const adminDemoSubmissionQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['all', ...demoSubmissionStatuses]).default('all'),
  template: z.enum(templateKeys).optional(),
});
export const adminDemoSubmissionListSchema = paginatedSchema(adminDemoSubmissionSchema);
export type AdminDemoSubmissionList = z.infer<typeof adminDemoSubmissionListSchema>;

/** PATCH /admin/demo-submissions/:id */
export const adminDemoSubmissionUpdateSchema = z.object({
  status: z.enum(demoSubmissionStatuses),
});
export const adminDemoSubmissionResponseSchema = z.object({
  submission: adminDemoSubmissionSchema,
});
