import { apiErrorBodySchema } from '@prajzo/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from '../test/helpers';

// These tests never connect a database, so every database-backed route is "unavailable".
describe('requireDatabase', () => {
  const app = testApp();

  it('answers at once with a clear 503 when the database is not connected', async () => {
    const started = Date.now();
    const response = await request(app).get('/api/v1/categories');

    expect(response.status).toBe(503);
    expect(apiErrorBodySchema.parse(response.body).error).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: expect.stringContaining('temporarily unavailable') as string,
    });
    expect(Date.now() - started).toBeLessThan(1000); // not the 10 s of waiting it replaces
  });

  it('protects the packages list and the contact form too', async () => {
    expect((await request(app).get('/api/v1/packages')).status).toBe(503);
    const contact = await request(app).post('/api/v1/contact').send({ name: 'x' });
    expect(contact.status).toBe(503);
  });

  it("does not use up a visitor's message allowance while the site is down", async () => {
    // The allowance is 5 messages per 15 minutes. Ten failed attempts must all report the
    // outage (503), never "too many messages" (429).
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app).post('/api/v1/contact').send({ name: 'x' });
      expect(response.status, `attempt ${attempt + 1}`).toBe(503);
    }
  });

  it('lets a visitor who is not signed in carry on, and fails fast for those who are', async () => {
    const visitor = await request(app).get('/api/v1/auth/me');
    expect(visitor.status).toBe(200); // no session cookie means no database is needed
    expect(visitor.body).toEqual({ user: null });

    const signedIn = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'prajzo.sid=s%3Aabc.def');
    expect(signedIn.status).toBe(503);
  });

  it('answers sign-in, sign-up and account routes with the same clear 503, without counting attempts', async () => {
    const paths = [
      ['post', '/api/v1/auth/login'],
      ['post', '/api/v1/auth/admin/login'],
      ['post', '/api/v1/auth/register'],
      ['post', '/api/v1/auth/password/forgot'],
      ['post', '/api/v1/auth/password/reset'],
      ['patch', '/api/v1/me'],
      ['get', '/api/v1/admin/overview'],
      ['post', '/api/v1/project-requests'],
      ['get', '/api/v1/project-requests'],
      ['get', '/api/v1/project-requests/PRZ-2026-0001'],
      ['post', '/api/v1/project-requests/PRZ-2026-0001/actions'],
    ] as const;
    for (let round = 0; round < 3; round += 1) {
      for (const [method, path] of paths) {
        const response = await request(app)[method](path).send({});
        expect(response.status, `${method} ${path}`).toBe(503);
      }
    }
  });

  it('signing out without a session needs nothing', async () => {
    expect((await request(app).post('/api/v1/auth/logout')).status).toBe(204);
  });

  it('keeps answering unknown routes with 404 and the health check with its own status', async () => {
    expect((await request(app).get('/api/v1/does-not-exist')).status).toBe(404);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
