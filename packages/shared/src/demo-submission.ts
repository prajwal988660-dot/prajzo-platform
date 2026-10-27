import { z } from 'zod';
import { templateKeys } from './site-config/config';

/**
 * The contact form inside a live demo (D-014). It really sends, so the demo is honest, but the
 * message only reaches Prajzo's admin inbox, no email is sent, and it is deleted after 7 days.
 * The same rules run in the browser and on the server.
 */
export const demoSubmissionRequestSchema = z.object({
  template: z.enum(templateKeys),
  name: z.string().trim().min(2, 'Enter your name').max(100, 'Keep your name under 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200, 'Keep the email address under 200 characters')
    .pipe(z.email('Enter an email address like name@example.com')),
  message: z
    .string()
    .trim()
    .min(10, 'Write a little more (at least 10 characters)')
    .max(2000, 'Keep your message under 2,000 characters'),
  /** Spam trap: hidden from people, so it must stay empty. */
  company: z.string().max(0).optional(),
});

export type DemoSubmissionValues = z.input<typeof demoSubmissionRequestSchema>;
export type DemoSubmissionRequest = z.output<typeof demoSubmissionRequestSchema>;

export const demoSubmissionResponseSchema = z.object({
  received: z.literal(true),
  /** When the message will be deleted (ISO date and time). */
  deleteAfter: z.iso.datetime(),
});

export type DemoSubmissionResponse = z.infer<typeof demoSubmissionResponseSchema>;
