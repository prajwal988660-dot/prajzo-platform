import { z } from 'zod';

/** Longest stack the browser sends; anything past this is cut off before sending (D-058). */
export const CLIENT_ERROR_STACK_MAX = 4000;

/**
 * A crash in a visitor's browser, sent to the API so it shows up in the server log (D-058).
 *
 * It holds only what is needed to find the fault: no form contents, no cookies, and the page's
 * path without its query string or `#` part (a password-reset link carries its token there).
 * The server never trusts it beyond logging it.
 */
export const clientErrorReportSchema = z.object({
  /** "error" for a thrown error, "unhandledrejection" for a promise nobody caught, "render" for a page crash. */
  kind: z.enum(['error', 'unhandledrejection', 'render']),
  message: z.string().max(1000),
  /** The script the error came from, when the browser says. */
  source: z.string().max(500).optional(),
  line: z.number().int().min(0).optional(),
  column: z.number().int().min(0).optional(),
  stack: z.string().max(CLIENT_ERROR_STACK_MAX).optional(),
  /** The page's path, such as `/account/projects`. */
  page: z
    .string()
    .max(500)
    .refine((value) => value.startsWith('/') && !/[?#]/.test(value), 'Send the path only'),
});

export type ClientErrorReport = z.infer<typeof clientErrorReportSchema>;
