import { healthResponseSchema, readinessResponseSchema } from '@prajzo/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDatabase } from '../../db/connection';
import { startTestDatabase, testApp } from '../../test/helpers';

describe('GET /api/health', () => {
  it('reports that the API is running', async () => {
    const response = await request(testApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body).status).toBe('ok');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('sends a request ID and security headers', async () => {
    const response = await request(testApp()).get('/api/health');

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('GET /api/health/ready with a real database', () => {
  let database: { stop: () => Promise<void> };

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  afterAll(async () => {
    await database.stop();
  });

  it('is ready while the database is connected', async () => {
    const response = await request(testApp()).get('/api/health/ready');

    expect(response.status).toBe(200);
    expect(readinessResponseSchema.parse(response.body)).toEqual({
      status: 'ready',
      database: 'connected',
    });
  });

  it('reports 503 once the database connection is gone', async () => {
    await disconnectDatabase();
    const response = await request(testApp()).get('/api/health/ready');

    expect(response.status).toBe(503);
    expect(readinessResponseSchema.parse(response.body)).toEqual({
      status: 'unavailable',
      database: 'disconnected',
    });
  });
});

describe('GET /api/health/ready when the database check fails', () => {
  it('returns 503 instead of throwing', async () => {
    const response = await request(testApp({ checkDatabase: () => Promise.resolve(false) })).get(
      '/api/health/ready',
    );
    expect(response.status).toBe(503);
  });
});
