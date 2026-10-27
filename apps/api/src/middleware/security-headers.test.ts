import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp, testEnv } from '../test/helpers';
import { permissionsPolicy } from './security-headers';

const production = () =>
  testApp({
    env: testEnv({ NODE_ENV: 'production', APP_ORIGIN: 'https://prajzo.example' }),
    checkDatabase: () => Promise.resolve(true),
  });
const development = () => testApp({ checkDatabase: () => Promise.resolve(true) });

describe('security headers', () => {
  it.each([
    ['development', development],
    ['production', production],
  ])('are on every answer in %s', async (_name, makeApp) => {
    const app = makeApp();
    for (const address of ['/api/health', '/api/v1/auth/me', '/api/v1/missing', '/api/missing']) {
      const { headers } = await request(app).get(address);
      expect(headers['x-content-type-options'], address).toBe('nosniff');
      expect(headers['x-frame-options'], address).toBe('SAMEORIGIN');
      expect(headers['referrer-policy'], address).toBe('no-referrer');
      expect(headers['cross-origin-opener-policy'], address).toBe('same-origin');
      expect(headers['cross-origin-resource-policy'], address).toBe('same-origin');
      expect(headers['x-powered-by'], address).toBeUndefined();
      expect(headers['permissions-policy'], address).toBe(permissionsPolicy);
    }
  });

  it('switch off the browser features the site never uses', () => {
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb', 'serial']) {
      expect(permissionsPolicy).toContain(`${feature}=()`);
    }
    // Nothing is switched on for other websites, and full screen stays within the site.
    expect(permissionsPolicy).not.toMatch(/=\(\*\)|=\*/);
    expect(permissionsPolicy).toContain('fullscreen=(self)');
  });

  it('lets scripts, styles and connections come only from the site itself', async () => {
    const { headers } = await request(production()).get('/api/health');
    const policy = headers['content-security-policy'] ?? '';
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ]) {
      expect(policy).toContain(directive);
    }
    expect(policy).not.toMatch(/unsafe-|\*/);
  });

  it('adds https-only rules in production and not on your own computer', async () => {
    const live = (await request(production()).get('/api/health')).headers;
    expect(live['strict-transport-security']).toBe('max-age=15552000; includeSubDomains');
    expect(live['content-security-policy']).toContain('upgrade-insecure-requests');

    const local = (await request(development()).get('/api/health')).headers;
    expect(local['strict-transport-security']).toBeUndefined();
    expect(local['content-security-policy']).not.toContain('upgrade-insecure-requests');
  });
});
