import { expect, test } from '@playwright/test';
import { builtFiles } from './helpers';

/**
 * What a visitor can download from the real production build (D-037): the readable source is not
 * among it, nothing needs the development server, and the files can be cached safely.
 */

test.describe('the files a visitor downloads', () => {
  test('have no source maps and no development code, and are named by their content', async ({
    request,
  }) => {
    const code = builtFiles().filter((file) => /\.(js|css)$/.test(file));
    expect(code.length).toBeGreaterThan(20);

    for (const file of code) {
      const response = await request.get(file);
      expect(response.status(), file).toBe(200);
      const text = await response.text();
      expect(text, `${file} points to a source map`).not.toMatch(/sourceMappingURL=/);
      expect(text, `${file} contains development-server code`).not.toMatch(
        /@vite\/client|@react-refresh|import\.meta\.hot/,
      );
      expect(file, `${file} is not named by its content`).toMatch(
        /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css)$/,
      );
      // The map a curious visitor would try next is not there either (a real 404, not the app).
      const map = await request.get(`${file}.map`);
      expect(map.status(), `${file}.map`).toBe(404);
      expect(map.headers()['content-type'], `${file}.map`).toContain('application/json');
    }
    expect(builtFiles().filter((file) => file.endsWith('.map'))).toEqual([]);
  });

  test('are served with the right type, and kept for a year when live (never on staging)', async ({
    request,
  }, testInfo) => {
    // Staging forbids shared caches altogether (see the gate); the live site lets files be kept.
    const caching =
      testInfo.project.name === 'staging'
        ? 'private, no-store'
        : 'public, max-age=31536000, immutable';
    const script = builtFiles().find((file) => file.endsWith('.js') && file.startsWith('/assets/'));
    const style = builtFiles().find((file) => file.endsWith('.css') && file.startsWith('/assets/'));
    const font = builtFiles().find((file) => file.endsWith('.woff2'));
    expect(script && style && font).toBeTruthy();

    const javascript = await request.get(script ?? '');
    expect(javascript.headers()['content-type']).toMatch(/javascript/);
    expect(javascript.headers()['cache-control']).toBe(caching);

    const css = await request.get(style ?? '');
    expect(css.headers()['content-type']).toMatch(/text\/css/);
    expect(css.headers()['cache-control']).toBe(caching);

    const woff = await request.get(font ?? '');
    expect(woff.headers()['content-type']).toMatch(/font\/woff2/);
    expect(woff.headers()['cache-control']).toBe(caching);
  });

  test('the page itself is never kept stale, and is built to run under the strict policy', async ({
    request,
  }, testInfo) => {
    const page = await request.get('/');
    expect(page.status()).toBe(200);
    // Staging also forbids shared caches altogether (see the gate).
    expect(page.headers()['cache-control']).toBe(
      testInfo.project.name === 'staging' ? 'private, no-store' : 'no-cache',
    );
    const html = await page.text();

    // No code or styling written into the page: the policy allows only our own files.
    const inlineScripts = [...html.matchAll(/<script\b([^>]*)>/g)].filter(
      (match) => !/\bsrc=/.test(match[1] ?? '') && !/application\/ld\+json/.test(match[1] ?? ''),
    );
    expect(inlineScripts).toEqual([]);
    expect(html).not.toMatch(/<style\b/);
    expect(html).not.toMatch(/\sstyle=/);
    expect(html).not.toMatch(/\son[a-z]+=/);
    for (const [, source] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
      expect(source).toMatch(/^\/assets\//);
    }
    for (const [, source] of html.matchAll(/<link\b[^>]*\bhref="([^"]+\.css)"/g)) {
      expect(source).toMatch(/^\/assets\//);
    }
    // Nothing is loaded from anywhere else.
    expect(html).not.toMatch(/(?:src|href)="https?:\/\//);
  });
});

test.describe('addresses that are not part of the site', () => {
  test('a missing file is a real 404, not the app pretending to be that file', async ({
    request,
  }) => {
    for (const address of [
      '/assets/missing-file.js',
      '/missing.png',
      '/.env',
      '/.git/config',
      '/package.json',
      '/apps/api/.env',
      '/server.js',
      '/index.html.bak',
    ]) {
      const response = await request.get(address);
      expect(response.status(), address).toBe(404);
      expect(await response.text(), address).not.toContain('<div id="root">');
    }
  });

  test('a made-up page address still opens the app, which shows its own "not found" page', async ({
    request,
  }) => {
    const response = await request.get('/some/page/that/does/not/exist');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<div id="root">');
  });

  test('an unknown API address is a JSON 404, never a page', async ({ request }) => {
    const response = await request.get('/api/v1/does-not-exist');
    expect(response.status()).toBe(404);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });
});
