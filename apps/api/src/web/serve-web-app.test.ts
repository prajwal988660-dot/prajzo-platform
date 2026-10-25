import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http, { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testApp, testEnv } from '../test/helpers';
import { looksLikeAFile } from './serve-web-app';

/** What actually travels over the wire for a request: the encoding used, and how many bytes. */
async function onTheWire(
  app: Parameters<typeof createServer>[1],
  address: string,
  acceptEncoding: string,
) {
  const server = createServer(app).listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as AddressInfo;
    return await new Promise<{
      encoding: string | undefined;
      vary: string | undefined;
      bytes: number;
    }>((resolve, reject) => {
      http
        .get(
          { port, path: address, headers: { 'Accept-Encoding': acceptEncoding } },
          (response) => {
            let bytes = 0;
            response.on('data', (chunk: Buffer) => (bytes += chunk.length));
            response.on('end', () =>
              resolve({
                encoding: response.headers['content-encoding'],
                vary: response.headers['vary'],
                bytes,
              }),
            );
          },
        )
        .on('error', reject);
    });
  } finally {
    server.close();
  }
}

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
    // Big enough to be worth compressing, and repetitive so it shrinks a lot.
    writeFileSync(
      path.join(distDir, 'assets', 'big-abc123.js'),
      'export const row = "the same line again and again";\n'.repeat(400),
    );
    writeFileSync(path.join(distDir, 'assets', 'font-abc123.woff2'), 'w'.repeat(5000));
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

  it('gives a real 404, not the web app, for files and hidden files that do not exist', async () => {
    for (const url of [
      '/missing.png',
      '/robots.txt',
      '/.env',
      '/.git/config',
      '/a/b/backup.sql',
      '/index.html.bak',
    ]) {
      const response = await request(app).get(url);
      expect(response.status, url).toBe(404);
      expect(response.text, url).not.toContain('<div id="root">');
    }
    // Pages with no dot in them are still the app's, even deep ones.
    expect((await request(app).get('/account/projects/PRZ-2026-0001')).status).toBe(200);
  });

  describe('compression', () => {
    it('shrinks pages and scripts for browsers that accept it, using the best they offer', async () => {
      const plain = await onTheWire(app, '/assets/big-abc123.js', 'identity');
      expect(plain.encoding).toBeUndefined();
      expect(plain.bytes).toBeGreaterThan(10_000);

      const brotli = await onTheWire(app, '/assets/big-abc123.js', 'br, gzip, deflate');
      expect(brotli.encoding).toBe('br');
      expect(brotli.vary).toContain('Accept-Encoding');
      expect(brotli.bytes).toBeLessThan(plain.bytes / 20);

      const gzip = await onTheWire(app, '/assets/big-abc123.js', 'gzip, deflate');
      expect(gzip.encoding).toBe('gzip');
      expect(gzip.bytes).toBeLessThan(plain.bytes / 20);
    });

    it('compresses the page too, and keeps its caching rules', async () => {
      const response = await request(app).get('/').set('Accept-Encoding', 'gzip');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.text).toContain('<div id="root">'); // decompressed by the client
    });

    it('leaves already compressed things alone', async () => {
      const font = await request(app)
        .get('/assets/font-abc123.woff2')
        .set('Accept-Encoding', 'br, gzip');
      expect(font.status).toBe(200);
      expect(font.headers['content-encoding']).toBeUndefined();
    });

    it('does not touch the API', async () => {
      const response = await request(app).get('/api/health').set('Accept-Encoding', 'br, gzip');
      expect(response.headers['content-encoding']).toBeUndefined();
    });
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

  it('serves the web app outside production only when asked (local hosting)', async () => {
    const localHosting = testApp({
      env: testEnv({ SERVE_WEB_APP: 'true', WEB_DIST_DIR: distDir }),
      checkDatabase: () => Promise.resolve(true),
    });
    const home = await request(localHosting).get('/contact');
    expect(home.status).toBe(200);
    expect(home.text).toContain('<div id="root">');
    // Plain http on your own computer: no HSTS and no forced https upgrade.
    expect(home.headers['strict-transport-security']).toBeUndefined();
    expect(home.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');

    const apiOnly = testApp({ env: testEnv(), checkDatabase: () => Promise.resolve(true) });
    expect((await request(apiOnly).get('/contact')).status).toBe(404);
  });
});

describe('looksLikeAFile', () => {
  it.each([
    '/logo.png',
    '/robots.txt',
    '/.env',
    '/.git/config',
    '/a/.hidden',
    '/x/y/z.sql',
    '/data.json',
  ])('says %s is a file', (address) => {
    expect(looksLikeAFile(address)).toBe(true);
  });

  it.each([
    '/',
    '/services',
    '/account/projects/PRZ-2026-0001',
    '/admin/catalogue/packages/business-plus',
    '/a-b_c',
  ])('says %s is a page of the app', (address) => {
    expect(looksLikeAFile(address)).toBe(false);
  });
});
