import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ConfigError, parseEnv } from '../config/env';
import { testApp, testEnv } from '../test/helpers';

const user = 'preview';
const password = 'a-long-staging-password';
const basic = (name: string, secret: string) =>
  `Basic ${Buffer.from(`${name}:${secret}`).toString('base64')}`;

describe('staging password', () => {
  let distDir: string;

  /** A site with a password, serving a small fake build. */
  const stagingApp = (settings: Record<string, string> = {}) =>
    testApp({
      env: testEnv({
        SERVE_WEB_APP: 'true',
        WEB_DIST_DIR: distDir,
        STAGING_PASSWORD: password,
        ...settings,
      }),
      checkDatabase: () => Promise.resolve(true),
    });

  beforeAll(() => {
    distDir = mkdtempSync(path.join(tmpdir(), 'prajzo-staging-'));
    mkdirSync(path.join(distDir, 'assets'));
    writeFileSync(
      path.join(distDir, 'index.html'),
      '<!doctype html><title>Prajzo</title><div id="root"></div>',
    );
    writeFileSync(path.join(distDir, 'assets', 'app-abc123.css'), '.secret-style{color:red}');
    writeFileSync(path.join(distDir, 'assets', 'app-abc123.js'), 'console.log("secret-script");');
    writeFileSync(path.join(distDir, 'favicon.png'), 'png');
  });

  afterAll(() => {
    rmSync(distDir, { recursive: true, force: true });
  });

  describe('without the password', () => {
    it('serves nothing: no page, style, script, image or API route', async () => {
      const app = stagingApp();
      const urls = [
        '/',
        '/services',
        '/assets/app-abc123.css',
        '/assets/app-abc123.js',
        '/favicon.png',
        '/api/health/ready',
        '/api/v1/categories',
        '/api/v1/auth/me',
        '/api/v1/nope',
      ];
      for (const url of urls) {
        const response = await request(app).get(url);
        expect(response.status, url).toBe(401);
        expect(response.headers['www-authenticate'], url).toMatch(/^Basic realm="Prajzo preview"/);
        // The refusal contains none of the site's files.
        expect(response.text, url).not.toMatch(/secret|root|Prajzo<\/title>/);
      }
    });

    it('also refuses requests that change data', async () => {
      const response = await request(stagingApp())
        .post('/api/v1/auth/login')
        .send({ email: 'a@example.com', password: 'whatever-it-is-123' });
      expect(response.status).toBe(401);
    });

    it('refuses wrong, empty and malformed credentials', async () => {
      const app = stagingApp();
      const attempts = [
        basic(user, 'not-the-password'),
        basic('someone-else', password),
        basic('', ''),
        basic(user, ''),
        basic(user.toUpperCase(), password),
        `Basic ${Buffer.from('no-colon-at-all').toString('base64')}`,
        'Basic !!!not-base64!!!',
        'Basic',
        `Bearer ${password}`,
        password,
      ];
      for (const header of attempts) {
        const response = await request(app).get('/').set('Authorization', header);
        expect(response.status, header).toBe(401);
      }
    });
  });

  describe('with the password', () => {
    it('serves the page, style, script, image and API as normal', async () => {
      const app = stagingApp();
      const page = await request(app).get('/contact').auth(user, password);
      expect(page.status).toBe(200);
      expect(page.text).toContain('<div id="root">');

      const style = await request(app).get('/assets/app-abc123.css').auth(user, password);
      expect(style.status).toBe(200);
      expect(style.text).toContain('.secret-style');

      const script = await request(app).get('/assets/app-abc123.js').auth(user, password);
      expect(script.status).toBe(200);

      expect((await request(app).get('/favicon.png').auth(user, password)).status).toBe(200);
      expect((await request(app).get('/api/health/ready').auth(user, password)).status).toBe(200);
      // A route that doesn't exist is still a normal JSON "not found", not a refusal.
      const missing = await request(app).get('/api/v1/nope').auth(user, password);
      expect(missing.status).toBe(404);
    });

    it('accepts a password that contains colons and spaces', async () => {
      const tricky = 'pass:word with spaces:and-colons-123';
      const app = stagingApp({ STAGING_PASSWORD: tricky });
      expect((await request(app).get('/').auth(user, tricky)).status).toBe(200);
      expect((await request(app).get('/').auth(user, 'pass')).status).toBe(401);
    });

    it('uses the user name you configure', async () => {
      const app = stagingApp({ STAGING_USER: 'studio' });
      expect((await request(app).get('/').auth('studio', password)).status).toBe(200);
      expect((await request(app).get('/').auth('preview', password)).status).toBe(401);
    });
  });

  it('keeps the plain "are you running?" check open, and nothing else under /api', async () => {
    const app = stagingApp();
    const alive = await request(app).get('/api/health');
    expect(alive.status).toBe(200);
    // It says only that the process is running; nothing about the database or the settings.
    expect(alive.body).toMatchObject({ status: 'ok' });
    expect(alive.body).not.toHaveProperty('database');
    expect((await request(app).head('/api/health')).status).toBe(200);
    expect((await request(app).get('/api/health/ready')).status).toBe(401);
    expect((await request(app).get('/api/health/')).status).toBe(401);
  });

  it('tells search engines to keep out and shared caches to keep nothing', async () => {
    const app = stagingApp();
    const refused = await request(app).get('/');
    const page = await request(app).get('/').auth(user, password);
    const style = await request(app).get('/assets/app-abc123.css').auth(user, password);
    const api = await request(app).get('/api/health/ready').auth(user, password);

    for (const response of [refused, page, style, api]) {
      expect(response.headers['x-robots-tag']).toContain('noindex');
      // "no-store": nobody, shared caches included, may keep a copy.
      const cacheControl = response.headers['cache-control'];
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).not.toContain('public');
      expect(cacheControl).not.toContain('immutable');
    }
    // What the gate and the file server send also says "private".
    for (const response of [refused, page, style]) {
      expect(response.headers['cache-control']).toContain('private');
    }
  });

  it('limits wrong guesses, then refuses even the right password until the time is up', async () => {
    const app = stagingApp();
    for (let guess = 1; guess <= 20; guess += 1) {
      const response = await request(app).get('/').auth(user, `wrong-guess-${guess}`);
      expect(response.status, `guess ${guess}`).toBe(401);
    }
    const blocked = await request(app).get('/').auth(user, 'wrong-guess-21');
    expect(blocked.status).toBe(429);
    expect(blocked.text).toContain('Too many wrong attempts');
    expect((await request(app).get('/').auth(user, password)).status).toBe(429);
  });

  it("doesn't count requests that carry no password, or correct ones", async () => {
    const app = stagingApp();
    // The first request of every visit has no password yet; crawlers send many.
    for (let visit = 0; visit < 30; visit += 1) {
      expect((await request(app).get('/')).status).toBe(401);
    }
    // Correct requests (one per page, image and script) never use up the allowance.
    for (let file = 0; file < 30; file += 1) {
      expect((await request(app).get('/').auth(user, password)).status).toBe(200);
    }
    expect((await request(app).get('/').auth(user, 'wrong')).status).toBe(401);
  });

  it("doesn't count what the site itself answers to a correct request, however many errors", async () => {
    const app = stagingApp();
    // A tester on the staging site mistypes things, follows a broken link, and sends a form with
    // mistakes. Each of those is an error answer from the site, not a wrong guess at the password.
    for (let mistake = 0; mistake < 60; mistake += 1) {
      const missing = await request(app).get('/api/v1/nope').auth(user, password);
      expect(missing.status).toBe(404);
      expect(missing.text).not.toContain('Too many');
      const asset = await request(app).get('/assets/missing.js').auth(user, password);
      expect(asset.status).toBe(404);
      const brokenRequest = await request(app)
        .post('/api/v1/nope')
        .auth(user, password)
        .set('Content-Type', 'application/json')
        .send('{ this is not json');
      expect(brokenRequest.status).toBe(400);
    }
    expect((await request(app).get('/').auth(user, password)).status).toBe(200);
  });

  it("doesn't count or delay correct requests made at the same moment", async () => {
    const app = stagingApp();
    // A page can ask for dozens of files at once.
    const answers = await Promise.all(
      Array.from({ length: 80 }, () => request(app).get('/').auth(user, password)),
    );
    expect(answers.map((answer) => answer.status)).toEqual(Array<number>(80).fill(200));
  });

  it('counts guesses for each address on its own, as seen through a proxy', async () => {
    const app = stagingApp({ TRUST_PROXY: 'true' });
    const from = (address: string) => (guess: string) =>
      request(app).get('/').set('X-Forwarded-For', address).auth(user, guess);
    const guesser = from('203.0.113.7');
    const bystander = from('203.0.113.8');

    for (let guess = 1; guess <= 20; guess += 1) {
      expect((await guesser(`wrong-${guess}`)).status).toBe(401);
    }
    expect((await guesser(password)).status).toBe(429);
    // Another visitor is untouched, and can still make a mistake of their own.
    expect((await bystander(password)).status).toBe(200);
    expect((await bystander('wrong')).status).toBe(401);
  });

  describe('when a block ends', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('says how long to wait, and lets the right password in again afterwards', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const app = stagingApp();
      for (let guess = 1; guess <= 20; guess += 1) {
        await request(app).get('/').auth(user, `wrong-${guess}`);
      }

      const blocked = await request(app).get('/').auth(user, password);
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(14 * 60);
      expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(15 * 60);

      vi.setSystemTime(Date.now() + 14 * 60 * 1000);
      expect((await request(app).get('/').auth(user, password)).status).toBe(429);
      vi.setSystemTime(Date.now() + 61 * 1000);
      expect((await request(app).get('/').auth(user, password)).status).toBe(200);
      // The allowance starts again from nothing.
      expect((await request(app).get('/').auth(user, 'wrong-again')).status).toBe(401);
    });
  });

  it('is completely off when no password is set', async () => {
    const app = testApp({
      env: testEnv({ SERVE_WEB_APP: 'true', WEB_DIST_DIR: distDir }),
      checkDatabase: () => Promise.resolve(true),
    });
    const page = await request(app).get('/');
    expect(page.status).toBe(200);
    expect(page.headers['www-authenticate']).toBeUndefined();
    expect(page.headers['x-robots-tag']).toBeUndefined();
    expect(page.headers['cache-control']).toBe('no-cache');
    const style = await request(app).get('/assets/app-abc123.css');
    expect(style.status).toBe(200);
    expect(style.headers['cache-control']).toContain('public');
  });
});

describe('staging password settings', () => {
  const base = {
    NODE_ENV: 'test',
    APP_ORIGIN: 'http://localhost:5173',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/prajzo-test',
    SESSION_SECRET: 'test-session-secret-that-is-long-enough-1234',
  };

  it('is off by default, with the user name "preview"', () => {
    const env = parseEnv(base);
    expect(env.STAGING_PASSWORD).toBeUndefined();
    expect(env.STAGING_USER).toBe('preview');
  });

  it('treats an empty value as not set', () => {
    expect(parseEnv({ ...base, STAGING_PASSWORD: '' }).STAGING_PASSWORD).toBeUndefined();
  });

  it('refuses a short password, naming the setting but never its value', () => {
    const short = 'too-short-1';
    const attempt = () => parseEnv({ ...base, STAGING_PASSWORD: short });
    expect(attempt).toThrow(ConfigError);
    expect(attempt).toThrow(/STAGING_PASSWORD must be at least 12 characters/);
    expect(attempt).not.toThrow(new RegExp(short));
  });

  it('refuses a user name that a browser could not send', () => {
    for (const bad of ['has:colon', 'has space', 'x'.repeat(33), 'naïve']) {
      expect(() => parseEnv({ ...base, STAGING_USER: bad }), bad).toThrow(/STAGING_USER/);
    }
    expect(parseEnv({ ...base, STAGING_USER: 'client.review_1-a' }).STAGING_USER).toBe(
      'client.review_1-a',
    );
  });
});
