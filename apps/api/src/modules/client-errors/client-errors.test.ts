import { Writable } from 'node:stream';
import { apiErrorBodySchema, type ClientErrorReport } from '@prajzo/shared';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { createCaptureMailer } from '../../services/mailer';
import { testEnv } from '../../test/helpers';

const validReport: ClientErrorReport = {
  kind: 'error',
  message: 'Cannot read properties of undefined (reading "status")',
  source: 'http://localhost:5173/assets/index-abc123.js',
  line: 1,
  column: 4021,
  stack: 'TypeError: Cannot read properties of undefined\n    at index-abc123.js:1:4021',
  page: '/account/projects',
};

/** An app whose log lines are kept, so a test can read what was written. */
function appWithLog(overrides: Record<string, string> = {}) {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  const app = createApp({
    env: testEnv(overrides),
    logger: pino({ level: 'info' }, stream),
    checkDatabase: () => Promise.resolve(true),
    mailer: createCaptureMailer(),
  });
  return { app, lines };
}

describe('POST /api/v1/client-errors', () => {
  it('logs the report with the request id and answers with no content', async () => {
    const { app, lines } = appWithLog();
    const response = await request(app)
      .post('/api/v1/client-errors')
      .set('User-Agent', 'Mozilla/5.0 (test)')
      .send(validReport);

    expect(response.status).toBe(204);
    const line = lines.find((entry) => entry.msg === "A visitor's browser reported an error");
    expect(line).toMatchObject({
      level: 40,
      clientError: validReport,
      userAgent: 'Mozilla/5.0 (test)',
      req: { id: response.headers['x-request-id'] as string },
    });
  });

  it('refuses a page address that carries a query string or # part', async () => {
    const { app, lines } = appWithLog();
    for (const page of ['/reset-password?token=abc', '/account#x', 'https://prajzo.com/']) {
      const response = await request(app)
        .post('/api/v1/client-errors')
        .send({ ...validReport, page });
      expect(response.status).toBe(400);
      expect(apiErrorBodySchema.parse(response.body).error.code).toBe('VALIDATION_FAILED');
    }
    expect(lines.some((entry) => 'clientError' in entry)).toBe(false);
  });

  it('refuses reports that are too large', async () => {
    const { app } = appWithLog();
    const response = await request(app)
      .post('/api/v1/client-errors')
      .send({ ...validReport, stack: 'x'.repeat(4001) });
    expect(response.status).toBe(400);
  });

  it('refuses reports sent from another website', async () => {
    const { app } = appWithLog();
    const response = await request(app)
      .post('/api/v1/client-errors')
      .set('Origin', 'https://evil.example')
      .send(validReport);
    expect(response.status).toBe(403);
  });

  it('limits how many reports one connection can send', async () => {
    const { app } = appWithLog({ CLIENT_ERROR_RATE_LIMIT_MAX: '2' });
    const send = () => request(app).post('/api/v1/client-errors').send(validReport);
    expect((await send()).status).toBe(204);
    expect((await send()).status).toBe(204);
    const refused = await send();
    expect(refused.status).toBe(429);
    expect(apiErrorBodySchema.parse(refused.body).error.code).toBe('RATE_LIMITED');
  });
});
