import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp, testEnv } from './test/helpers';

/**
 * Nothing the API says may be kept by a browser or a shared cache, unless a route says so on
 * purpose (only the public catalogue does, and only when it succeeds; see catalogue.test.ts).
 */
describe('what the API lets caches keep', () => {
  const app = testApp({ checkDatabase: () => Promise.resolve(true) });

  it.each([
    ['who is signed in', '/api/v1/auth/me'],
    ['an unknown API address', '/api/v1/does-not-exist'],
    ['a refusal (not signed in)', '/api/v1/admin/overview'],
    ['the "are you running?" check', '/api/health'],
    ['the readiness check', '/api/health/ready'],
  ])('says "never store" for %s', async (_what, address) => {
    const response = await request(app).get(address);
    expect(response.headers['cache-control'], address).toBe('no-store');
  });

  it('leaves an unrelated address under /api alone, rather than claiming a rule for it', async () => {
    // Health's own rule once applied to all of /api by mistake; it must stay on its own routes.
    const response = await request(app).get('/api/nothing-here');
    expect(response.headers['cache-control']).toBeUndefined();
  });

  it("keeps the staging gate's stricter rule everywhere under a password", async () => {
    const password = 'a-long-staging-password';
    const staging = testApp({
      env: testEnv({ STAGING_PASSWORD: password }),
      checkDatabase: () => Promise.resolve(true),
    });
    for (const address of ['/api/v1/auth/me', '/api/v1/does-not-exist', '/api/v1/admin/overview']) {
      const response = await request(staging).get(address).auth('preview', password);
      expect(response.headers['cache-control'], address).toBe('private, no-store');
    }
  });
});
