import { z } from 'zod';
import { templateKeys } from './site-config/config';

/**
 * The forms inside a live demo (D-014): a contact message, or a registration (Event demo, Phase
 * 11). They really send, so the demo is honest, but they only reach Prajzo's demo inbox, no email
 * is sent, and they are deleted after 7 days. The same rules run in the browser and on the server.
 */

const name = z
  .string()
  .trim()
  .min(2, 'Enter your name')
  .max(100, 'Keep your name under 100 characters');
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(200, 'Keep the email address under 200 characters')
  .pipe(z.email('Enter an email address like name@example.com'));
/** Spam trap: hidden from people, so it must stay empty. */
const company = z.string().max(0).optional();

export const demoContactSchema = z.object({
  form: z.literal('contact').default('contact'),
  template: z.enum(templateKeys),
  name,
  email,
  message: z
    .string()
    .trim()
    .min(10, 'Write a little more (at least 10 characters)')
    .max(2000, 'Keep your message under 2,000 characters'),
  company,
});

export const demoRegistrationSchema = z.object({
  form: z.literal('registration'),
  template: z.enum(templateKeys),
  name,
  email,
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => value === '' || /^\+?[0-9 ()-]{7,20}$/.test(value),
      'Enter a phone number using digits, spaces or +',
    )
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  organisation: z
    .string()
    .trim()
    .max(100, 'Keep this under 100 characters')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  /** Which of the form's events; the server checks it is one the form offers. */
  choice: z.string().trim().min(1, 'Choose one').max(60),
  company,
});

/** An enquiry about a product (Catalogue demo, Phase 12). There are no payments. */
export const demoEnquirySchema = z.object({
  form: z.literal('enquiry'),
  template: z.enum(templateKeys),
  name,
  email,
  phone: demoRegistrationSchema.shape.phone,
  /** Which product; the server checks it is one the catalogue has. */
  choice: z.string().trim().min(1, 'Choose a product').max(60),
  quantity: z
    .union([z.number(), z.string()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? undefined : Number(value)))
    .pipe(
      z
        .number()
        .int('Enter a whole number')
        .min(1, 'Enter 1 or more')
        .max(10_000, 'Enter 10,000 or less')
        .optional(),
    ),
  message: z
    .string()
    .trim()
    .max(1000, 'Keep your note under 1,000 characters')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  company,
});

/** Any of the forms. A request with no `form` is a contact message (as before Phase 11). */
export const demoSubmissionRequestSchema = z.preprocess(
  (value) =>
    value && typeof value === 'object' && !('form' in value)
      ? { ...value, form: 'contact' }
      : value,
  z.discriminatedUnion('form', [demoContactSchema, demoRegistrationSchema, demoEnquirySchema]),
);
export type DemoEnquiryValues = z.input<typeof demoEnquirySchema>;

export type DemoSubmissionValues = z.input<typeof demoContactSchema>;
export type DemoRegistrationValues = z.input<typeof demoRegistrationSchema>;
export type DemoSubmissionRequest = z.output<typeof demoSubmissionRequestSchema>;

export const demoSubmissionResponseSchema = z.object({
  received: z.literal(true),
  /** When the message will be deleted (ISO date and time). */
  deleteAfter: z.iso.datetime(),
});

export type DemoSubmissionResponse = z.infer<typeof demoSubmissionResponseSchema>;
