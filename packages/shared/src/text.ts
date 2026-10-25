import { z } from 'zod';

/** Optional text: trimmed, and an empty answer counts as "not given". */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

/** Text that must be filled in, with its own wording for "too short" and "too long". */
export const requiredText = (min: number, max: number, tooShort: string, tooLong?: string) =>
  z
    .string()
    .trim()
    .min(min, tooShort)
    .max(max, tooLong ?? `Keep this under ${max.toLocaleString('en-US')} characters`);

/** Keys that name things in the catalogue: lower case words joined by dashes. */
export const keySchema = z
  .string()
  .trim()
  .min(3, 'Use at least 3 characters')
  .max(60, 'Use at most 60 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lower-case letters and numbers, joined by dashes (for example "online-shop")',
  );
