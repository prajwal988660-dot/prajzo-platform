import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/** The sentence to show when a request failed: the server's own message when it sent one. */
export function submitErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Puts the server's per-field messages (for example "An account with this email already exists")
 * next to the matching fields, when the server rejected something the browser let through.
 */
export function applyServerFieldErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  error: unknown,
  fieldNames: readonly string[],
): void {
  if (!(error instanceof ApiError) || !error.fields) return;
  for (const [field, message] of Object.entries(error.fields)) {
    if (fieldNames.includes(field)) setError(field as FieldPath<TFieldValues>, { message });
  }
}
