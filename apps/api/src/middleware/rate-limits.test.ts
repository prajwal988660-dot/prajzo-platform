import { apiErrorBodySchema } from '@prajzo/shared';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { testApp, testEnv } from '../test/helpers';
import { proxyCheck } from './rate-limits';

const up = () => Promise.resolve(true);

function appWithLimit(max: number, overrides: Record<string, string> = {}) {
  return testApp({
    env: testEnv({ API_RATE_LIMIT_MAX: String(max), ...overrides }),
    checkDatabase: up,
  });
}

describe('the overall limit on the API', () => {
  it('refuses a connection that goes over, in the usual error format, and says when to retry', async () => {
    const app = appWithLimit(3);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect((await request(app).get('/api/health/ready')).status, `request ${attempt}`).toBe(200);
    }
    const refused = await request(app).get('/api/health/ready');

    expect(refused.status).toBe(429);
    expect(apiErrorBodySchema.parse(refused.body).error.code).toBe('RATE_LIMITED');
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(refused.headers['retry-after'])).toBeLessThanOrEqual(60);
    expect(refused.headers['ratelimit']).toBeDefined();
  });

  it('counts every kind of API request, including the readiness check and addresses that do not exist', async () => {
    const app = appWithLimit(4);

    expect((await request(app).get('/api/health/ready')).status).toBe(200);
    expect((await request(app).get('/api/v1/no-such-thing')).status).toBe(404);
    expect((await request(app).get('/api/no-such-thing')).status).toBe(404);
    expect((await request(app).post('/api/v1/no-such-thing').send({})).status).toBe(404);

    expect((await request(app).get('/api/health/ready')).status).toBe(429);
    expect((await request(app).get('/api/v1/no-such-thing')).status).toBe(429);
  });

  it('never limits the plain health check, which a host may ask for as often as it likes', async () => {
    const app = appWithLimit(2);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect((await request(app).get('/api/health')).status).toBe(200);
      expect((await request(app).head('/api/health')).status).toBe(200);
    }
    // ...and asking for it does not use up what a visitor is allowed.
    expect((await request(app).get('/api/health/ready')).status).toBe(200);
    expect((await request(app).get('/api/health/ready')).status).toBe(200);
    expect((await request(app).get('/api/health/ready')).status).toBe(429);
  });

  it('keeps visitors apart when the site is behind a trusted proxy', async () => {
    const app = appWithLimit(2, { TRUST_PROXY: 'true' });
    const as = (address: string) =>
      request(app).get('/api/health/ready').set('X-Forwarded-For', address);

    expect((await as('203.0.113.1')).status).toBe(200);
    expect((await as('203.0.113.1')).status).toBe(200);
    expect((await as('203.0.113.1')).status).toBe(429);

    expect((await as('203.0.113.2')).status).toBe(200); // somebody else is not affected
  });

  it('does not believe an address the visitor makes up when no proxy is trusted', async () => {
    const app = appWithLimit(2);
    const claiming = (address: string) =>
      request(app).get('/api/health/ready').set('X-Forwarded-For', address);

    expect((await claiming('203.0.113.1')).status).toBe(200);
    expect((await claiming('203.0.113.2')).status).toBe(200);
    expect((await claiming('203.0.113.3')).status).toBe(429);
  });

  it('refuses before the request body is read', async () => {
    const app = appWithLimit(1);
    const brokenJson = () =>
      request(app).post('/api/v1/no-such-thing').set('Content-Type', 'application/json').send('{');

    expect((await brokenJson()).status).toBe(400); // read, and found to be broken
    expect((await brokenJson()).status).toBe(429); // never read
  });

  it('is generous by default: a person browsing never comes near it', async () => {
    expect(testEnv().API_RATE_LIMIT_MAX).toBe(600);
    const app = testApp({ checkDatabase: up });
    for (let attempt = 0; attempt < 60; attempt += 1) {
      expect((await request(app).get('/api/health/ready')).status).toBe(200);
    }
  });
});

describe('the check that the proxy setting matches how the site is hosted', () => {
  function checked(env: { NODE_ENV: string; TRUST_PROXY: boolean }) {
    const warn = vi.fn();
    const app = express();
    app.use(proxyCheck(env, { warn }));
    app.use((_req, res) => void res.send('ok'));
    return { app, warn };
  }

  it('warns once when requests come through a proxy but the setting is off', async () => {
    const { app, warn } = checked({ NODE_ENV: 'production', TRUST_PROXY: false });

    await request(app).get('/').set('X-Forwarded-For', '203.0.113.1');
    await request(app).get('/pricing').set('X-Forwarded-For', '203.0.113.2');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/TRUST_PROXY=true/);
  });

  it('warns once when the setting is on but a request comes with no proxy header', async () => {
    const { app, warn } = checked({ NODE_ENV: 'production', TRUST_PROXY: true });

    await request(app).get('/');
    await request(app).get('/pricing');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/pretend to be any address/);
  });

  it('stays quiet when the setting matches how the site is hosted', async () => {
    const behind = checked({ NODE_ENV: 'production', TRUST_PROXY: true });
    await request(behind.app).get('/').set('X-Forwarded-For', '203.0.113.1');
    const direct = checked({ NODE_ENV: 'production', TRUST_PROXY: false });
    await request(direct.app).get('/');

    expect(behind.warn).not.toHaveBeenCalled();
    expect(direct.warn).not.toHaveBeenCalled();
  });

  it('ignores health checks, which a host often asks for without its proxy', async () => {
    const { app, warn } = checked({ NODE_ENV: 'production', TRUST_PROXY: true });

    await request(app).get('/api/health');
    await request(app).get('/api/health/ready');

    expect(warn).not.toHaveBeenCalled();
  });

  it('says nothing while developing or testing', async () => {
    const { app, warn } = checked({ NODE_ENV: 'development', TRUST_PROXY: false });

    await request(app).get('/').set('X-Forwarded-For', '203.0.113.1');

    expect(warn).not.toHaveBeenCalled();
  });
});
