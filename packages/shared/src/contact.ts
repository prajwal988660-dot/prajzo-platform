import { z } from 'zod';
import { optionalText } from './text';

/**
 * The contact form. The same rules run in the browser (instant feedback) and on the server
 * (the server never trusts the browser).
 */
export const contactRequestSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100, 'Keep your name under 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200, 'Keep the email address under 200 characters')
    .pipe(z.email('Enter an email address like name@example.com')),
  phone: optionalText(30).refine(
    (value) => value === undefined || /^\+?[0-9 ()-]{7,20}$/.test(value),
    'Enter a phone number using digits, spaces or +',
  ),
  /** Category key from the service catalogue, or "other". */
  websiteType: optionalText(60),
  /** Package key, or "not-sure". */
  packageKey: optionalText(60),
  message: z
    .string()
    .trim()
    .min(20, 'Tell us a little more (at least 20 characters)')
    .max(3000, 'Keep your message under 3,000 characters'),
  consent: z.boolean().refine((value) => value, 'Tick this box so we can reply to you'),
  /** Spam trap: hidden from people, so it must stay empty. */
  company: z.string().max(0).optional(),
});

/** What the form holds (before cleaning). */
export type ContactFormValues = z.input<typeof contactRequestSchema>;
/** What the server stores (after cleaning). */
export type ContactRequest = z.output<typeof contactRequestSchema>;

export const contactResponseSchema = z.object({
  received: z.literal(true),
  message: z.string(),
});
export type ContactResponse = z.infer<typeof contactResponseSchema>;
