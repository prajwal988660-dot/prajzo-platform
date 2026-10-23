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

  it('keeps answering unknown routes with 404 and the health check with its own status', async () => {
    expect((await request(app).get('/api/v1/does-not-exist')).status).toBe(404);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
