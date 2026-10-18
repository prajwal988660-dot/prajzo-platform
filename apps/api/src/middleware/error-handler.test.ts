import { apiErrorBodySchema } from '@prajzo/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../lib/errors';
import { testApp } from '../test/helpers';
import { toErrorResponse } from './error-handler';

describe('API error responses', () => {
  const app = testApp({ checkDatabase: () => Promise.resolve(true) });

  it('answers unknown API routes with a JSON 404', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(apiErrorBodySchema.parse(response.body).error.code).toBe('NOT_FOUND');
  });

  it('rejects malformed JSON with 400 INVALID_JSON', async () => {
    const response = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(response.status).toBe(400);
    expect(apiErrorBodySchema.parse(response.body).error.code).toBe('INVALID_JSON');
  });

  it('rejects bodies over 100 kB with 413 PAYLOAD_TOO_LARGE', async () => {
    const response = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ text: 'x'.repeat(110_000) }));

    expect(response.status).toBe(413);
    expect(apiErrorBodySchema.parse(response.body).error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('toErrorResponse', () => {
  it('keeps the status, code, message and fields of an AppError', () => {
    const result = toErrorResponse(
      new AppError(409, 'CONFLICT', 'That email is already registered.', {
        email: 'Already registered',
      }),
    );
    expect(result).toEqual({
      status: 409,
      body: {
        error: {
          code: 'CONFLICT',
          message: 'That email is already registered.',
          fields: { email: 'Already registered' },
        },
      },
    });
  });

  it('turns validation errors into one message per field', () => {
    const parsed = z
      .object({
        email: z.email('Enter a valid email address'),
        name: z.string().min(2, 'Too short'),
      })
      .safeParse({ email: 'nope', name: 'a' });
    if (parsed.success) throw new Error('expected validation to fail');

    const result = toErrorResponse(parsed.error);
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('VALIDATION_FAILED');
    expect(result.body.error.fields).toEqual({
      email: 'Enter a valid email address',
      name: 'Too short',
    });
  });

  it('hides the details of unexpected errors', () => {
    const result = toErrorResponse(new Error('connection string mongodb://admin:hunter2@db'));
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(result.body)).not.toContain('hunter2');
  });
});
