import { describe, expect, it } from 'vitest';
import { apiErrorBodySchema } from './errors';
import { readinessResponseSchema } from './health';

describe('apiErrorBodySchema', () => {
  it('accepts an error with field messages', () => {
    const body = {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Check the highlighted fields.',
        fields: { email: 'Enter a valid email address' },
      },
    };
    expect(apiErrorBodySchema.parse(body)).toEqual(body);
  });

  it('accepts an error without fields', () => {
    expect(
      apiErrorBodySchema.safeParse({ error: { code: 'NOT_FOUND', message: 'Not found' } }).success,
    ).toBe(true);
  });

  it('rejects bodies that are not in the error format', () => {
    expect(apiErrorBodySchema.safeParse({ message: 'oops' }).success).toBe(false);
    expect(apiErrorBodySchema.safeParse({ error: { code: 500 } }).success).toBe(false);
  });
});

describe('readinessResponseSchema', () => {
  it('only allows the known states', () => {
    expect(
      readinessResponseSchema.safeParse({ status: 'ready', database: 'connected' }).success,
    ).toBe(true);
    expect(
      readinessResponseSchema.safeParse({ status: 'maybe', database: 'connected' }).success,
    ).toBe(false);
  });
});
