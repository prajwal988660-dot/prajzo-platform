import { expect, test } from '@playwright/test';
import { builtFiles } from './helpers';

/**
 * Security headers on the real production build: on pages, files, API answers and error answers
 * alike. Runs against the live server (no staging password), as visitors will see it.
 */

const script = () => builtFiles().find((file) => /^\/assets\/.+\.js$/.test(file)) ?? '';
const style = () => builtFiles().find((file) => /^\/assets\/.+\.css$/.test(file)) ?? '';

const everyKindOfAnswer = () => [
  ['the page', '/'],
  ['a page that does not exist', '/no/such/page'],
  ['a script', script()],
  ['a style sheet', style()],
  ['an API answer', '/api/v1/categories'],
  ['an API refusal (not signed in)', '/api/v1/admin/overview'],
  ['an API "not found"', '/api/v1/nothing-here'],
  ['a missing file', '/assets/missing.js'],
  ['the health check', '/api/health'],
];

test.describe('security headers', () => {
  test('every answer carries them', async ({ request }) => {
    for (const [what, address] of everyKindOfAnswer()) {
      const headers = (await request.get(address ?? '')).headers();
      const note = `${what} (${address})`;

      expect(headers['x-content-type-options'], note).toBe('nosniff');
      expect(headers['x-frame-options'], note).toBe('SAMEORIGIN');
      expect(headers['referrer-policy'], note).toBe('no-referrer');
      expect(headers['cross-origin-opener-policy'], note).toBe('same-origin');
      expect(headers['cross-origin-resource-policy'], note).toBe('same-origin');
      expect(headers['strict-transport-security'], note).toMatch(
        /^max-age=\d{7,}; includeSubDomains$/,
      );
      // The browser features the site never uses are switched off, even for code that got in.
      for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
        expect(headers['permissions-policy'], note).toContain(`${feature}=()`);
      }
      expect(headers['permissions-policy'], note).not.toMatch(/=\(\*\)|=\*/);
      // Nothing that tells a stranger what software is running.
      expect(headers['x-powered-by'], note).toBeUndefined();
      expect(headers['server'], note).toBeUndefined();
    }
  });

  test('the content security policy lets in our own files and nothing else', async ({
    request,
  }) => {
    for (const [what, address] of everyKindOfAnswer()) {
      const policy = (await request.get(address ?? '')).headers()['content-security-policy'] ?? '';
      const note = `${what} (${address})`;
      const directives = Object.fromEntries(
        policy
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const [name = '', ...values] = part.split(/\s+/);
            return [name, values];
          }),
      ) as Record<string, string[]>;

      expect(directives['default-src'], note).toEqual(["'self'"]);
      expect(directives['script-src'], note).toEqual(["'self'"]);
      expect(directives['style-src'], note).toEqual(["'self'"]);
      expect(directives['connect-src'], note).toEqual(["'self'"]);
      expect(directives['object-src'], note).toEqual(["'none'"]);
      expect(directives['base-uri'], note).toEqual(["'self'"]);
      expect(directives['form-action'], note).toEqual(["'self'"]);
      expect(directives['frame-ancestors'], note).toEqual(["'self'"]);
      expect(directives['upgrade-insecure-requests'], note).toEqual([]);
      // No way for injected code to run, and no loading from other websites.
      expect(policy, note).not.toMatch(/unsafe-inline|unsafe-eval|unsafe-hashes/);
      expect(policy, note).not.toMatch(/\*|https?:/);
    }
  });

  test('what is private is never stored, and the public catalogue only briefly', async ({
    request,
  }) => {
    expect((await request.get('/api/v1/admin/overview')).headers()['cache-control']).toBe(
      'no-store',
    );
    expect((await request.get('/api/v1/auth/me')).headers()['cache-control']).toBe('no-store');
    expect((await request.get('/api/health/ready')).headers()['cache-control']).toBe('no-store');
    expect((await request.get('/api/v1/categories')).headers()['cache-control']).toBe(
      'public, max-age=60',
    );
  });
});
