import { z } from 'zod';

/** Error codes the API can return. Clients should still handle codes they don't recognise. */
export const apiErrorCodes = [
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'INVALID_JSON',
  'PAYLOAD_TOO_LARGE',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

/**
 * Every API error response has this shape, for example:
 * { "error": { "code": "VALIDATION_FAILED", "message": "…", "fields": { "email": "Enter a valid email address" } } }
 */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
