import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testApp, testEnv } from '../test/helpers';

describe('serving the built web app in production', () => {
  let distDir: string;
  let app: ReturnType<typeof testApp>;

  beforeAll(() => {
    distDir = mkdtempSync(path.join(tmpdir(), 'prajzo-web-dist-'));
    mkdirSync(path.join(distDir, 'assets'));
    writeFileSync(
      path.join(distDir, 'index.html'),
      '<!doctype html><title>Prajzo</title><div id="root"></div>',
    );
    writeFileSync(path.join(distDir, 'assets', 'index-abc123.js'), 'console.log("app");');
    writeFileSync(path.join(distDir, 'favicon.png'), 'png');

    const env = testEnv({
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://prajzo.example',
      WEB_DIST_DIR: distDir,
    });
    app = testApp({ env, checkDatabase: () => Promise.resolve(true) });
  });

  afterAll(() => {
    rmSync(distDir, { recursive: true, force: true });
  });

  it('serves the web app for the home page and for client-side routes', async () => {
    for (const url of ['/', '/services', '/templates/portfolio']) {
      const response = await request(app).get(url);
      expect(response.status, url).toBe(200);
      expect(response.text, url).toContain('<div id="root">');
      expect(response.headers['cache-control'], url).toBe('no-cache');
    }
  });

  it('caches hashed assets for a year', async () => {
    const response = await request(app).get('/assets/index-abc123.js');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('returns 404 for a missing asset instead of the HTML page', async () => {
    const response = await request(app).get('/assets/missing.js');
    expect(response.status).toBe(404);
  });

  it('still answers unknown API routes with JSON, not HTML', async () => {
    const response = await request(app).get('/api/v1/nope');
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('sends HSTS in production', async () => {
    const response = await request(app).get('/');
    expect(response.headers['strict-transport-security']).toContain('max-age=15552000');
  });
});
