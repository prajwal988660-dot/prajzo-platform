import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  fullTitle,
  indexablePaths,
  logoImagePath,
  pagePaths,
  sharingImage,
  sitePages,
  type SitePagePath,
} from '../packages/shared/src/site-pages';

/**
 * What search engines, link previews and browsers learn about each page, on the real production
 * build (D-053, D-054). Runs against the live server, whose public address (APP_ORIGIN) is set in
 * apps/api/src/scripts/production-check-server.ts.
 *
 * The raw HTML is read the way a crawler or a link preview reads it, with no JavaScript, because
 * that is how most of them do.
 */

const siteOrigin = 'https://prajzo.test';

const decode = (text: string) =>
  text
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
const tag = (html: string, kind: 'name' | 'property', name: string) => {
  const found = new RegExp(`<meta ${kind}="${name}" content="([^"]*)" />`).exec(html)?.[1];
  return found === undefined ? undefined : decode(found);
};
const titleOf = (html: string) => decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');
const canonicalOf = (html: string) => /<link rel="canonical" href="([^"]*)" \/>/.exec(html)?.[1];
const nameOf = (path: SitePagePath) => {
  const page = sitePages[path];
  return 'name' in page ? page.name : undefined;
};

async function rawPage(request: APIRequestContext, address: string) {
  const response = await request.get(address, {
    headers: { 'User-Agent': 'facebookexternalhit/1.1' },
  });
  return { response, html: await response.text() };
}

const pngSize = (bytes: Buffer) => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});

test.describe('robots.txt and the sitemap', () => {
  test('robots.txt lets everyone in except the API, points to the sitemap, and hides nothing private by naming it', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^text\/plain/);
    const text = await response.text();
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Disallow: /api/');
    expect(text).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`);
    expect(text).not.toMatch(/admin|account/i);
  });

  test('the sitemap lists exactly the pages worth listing, as full addresses', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^application\/xml/);
    const xml = await response.text();
    const addresses = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(addresses).toEqual(indexablePaths.map((path) => `${siteOrigin}${path}`));
    expect(xml).not.toMatch(/login|register|password|account|admin|\/api/);
    expect(xml).not.toContain('<lastmod>');
  });

  test('every address in the sitemap is a real page that is not marked as private', async ({
    request,
  }) => {
    for (const path of indexablePaths) {
      const { response, html } = await rawPage(request, path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['x-robots-tag'], path).toBeUndefined();
      expect(html, path).not.toContain('name="robots"');
    }
  });
});

test.describe('what a crawler or link preview reads, without running the app', () => {
  for (const path of pagePaths) {
    const page = sitePages[path];
    test(`${path} has its own title and description${page.index ? ', canonical address and sharing details' : ' and is kept out of search results'}`, async ({
      request,
    }) => {
      const { response, html } = await rawPage(request, path);
      const title = fullTitle(nameOf(path));

      expect(response.status()).toBe(200);
      expect(titleOf(html)).toBe(title);
      expect(tag(html, 'name', 'description')).toBe(page.description);

      if (page.index) {
        const address = `${siteOrigin}${path}`;
        expect(canonicalOf(html)).toBe(address);
        expect(tag(html, 'property', 'og:url')).toBe(address);
        expect(tag(html, 'property', 'og:title')).toBe(title);
        expect(tag(html, 'property', 'og:description')).toBe(page.description);
        expect(tag(html, 'property', 'og:image')).toBe(`${siteOrigin}${sharingImage.path}`);
        expect(tag(html, 'property', 'og:image:width')).toBe('1200');
        expect(tag(html, 'property', 'og:image:height')).toBe('630');
        expect(tag(html, 'name', 'twitter:card')).toBe('summary_large_image');
        expect(tag(html, 'name', 'twitter:image')).toBe(`${siteOrigin}${sharingImage.path}`);
        expect(response.headers()['x-robots-tag']).toBeUndefined();
      } else {
        expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
        expect(canonicalOf(html)).toBeUndefined();
        expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
      }
    });
  }

  test('the home page tells search engines about the business, using only what the website already says', async ({
    request,
  }) => {
    const { html } = await rawPage(request, '/');
    const found = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    expect(found).toHaveLength(1);
    const data = JSON.parse(found[0]?.[1] ?? '') as { '@graph': Record<string, unknown>[] };
    const organization = data['@graph'].find((item) => item['@type'] === 'Organization');
    expect(organization).toMatchObject({
      name: 'Prajzo',
      url: `${siteOrigin}/`,
      logo: `${siteOrigin}${logoImagePath}`,
      email: 'contact@prajzo.com',
    });
    expect(Object.keys(organization ?? {})).not.toContain('address');
    expect(Object.keys(organization ?? {})).not.toContain('aggregateRating');
  });

  test('private areas and unknown addresses are kept out of search results', async ({
    request,
  }) => {
    for (const address of [
      '/account',
      '/account/projects/PRZ-2026-0001',
      '/admin',
      '/admin/projects',
    ]) {
      const { response, html } = await rawPage(request, address);
      expect(response.status(), address).toBe(200); // the app asks the visitor to sign in
      expect(response.headers()['x-robots-tag'], address).toBe('noindex, nofollow');
      expect(html, address).toContain('<meta name="robots" content="noindex, nofollow" />');
      expect(canonicalOf(html), address).toBeUndefined();
    }
    for (const address of [
      '/no-such-page',
      '/accounts',
      '/administrator',
      '/services/extra',
      '/dev/ui',
    ]) {
      const { response, html } = await rawPage(request, address);
      expect(response.status(), address).toBe(404);
      expect(response.headers()['x-robots-tag'], address).toBe('noindex, nofollow');
      expect(html, address).toContain('<title>Page not found · Prajzo</title>');
      expect(canonicalOf(html), address).toBeUndefined();
    }
  });
});

test.describe('in a browser, once the app has started', () => {
  test('every listed page keeps the title, description and canonical address the crawler was given', async ({
    page,
    request,
  }) => {
    for (const path of indexablePaths) {
      const { html } = await rawPage(request, path);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page, path).toHaveTitle(titleOf(html));
      await expect(page.locator('meta[name="description"]'), path).toHaveAttribute(
        'content',
        tag(html, 'name', 'description') ?? '',
      );
      await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute(
        'href',
        canonicalOf(html) ?? '',
      );
    }
  });

  test('moving between pages inside the app updates them, and keeps the website address', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveTitle('Services · Prajzo');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      sitePages['/services'].description,
    );
    // The address learned from the server (not the one the browser happens to be using).
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${siteOrigin}/services`,
    );

    await page.getByRole('banner').getByRole('link', { name: 'Pricing' }).click();
    await expect(page).toHaveTitle('Pricing and Plans · Prajzo');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${siteOrigin}/pricing`,
    );
  });

  test('a page that must not be listed says so when reached inside the app, and says no more when left', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveTitle('Sign in · Prajzo');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

    await page.getByRole('banner').getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${siteOrigin}/`);
  });

  test('an unknown address shows the not-found page, with the right status', async ({ page }) => {
    const response = await page.goto('/this/does/not/exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(page).toHaveTitle('Page not found · Prajzo');
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });
});

test.describe('icons, manifest and the sharing picture', () => {
  test('every icon the page points to exists, with the right type and size', async ({
    request,
  }) => {
    const { html } = await rawPage(request, '/');
    const links = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]);
    const iconLinks = links.filter((link) => /rel="(?:icon|apple-touch-icon)"/.test(link));
    expect(iconLinks.length).toBeGreaterThanOrEqual(4);

    for (const link of iconLinks) {
      const href = /href="([^"]+)"/.exec(link)?.[1] ?? '';
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
      const bytes = await response.body();
      const sizes = /sizes="(\d+)x(\d+)"/.exec(link);
      if (href.endsWith('.png')) {
        expect(response.headers()['content-type'], href).toBe('image/png');
        if (sizes)
          expect(pngSize(bytes), href).toEqual({
            width: Number(sizes[1]),
            height: Number(sizes[2]),
          });
      } else {
        // favicon.ico: a real icon file holding the three sizes browsers ask for.
        expect(response.headers()['content-type'], href).toMatch(/icon/);
        expect([...bytes.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
        expect(bytes.readUInt16LE(4)).toBe(3);
        expect([0, 1, 2].map((index) => bytes[6 + index * 16])).toEqual([16, 32, 48]);
      }
    }
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(pngSize(await (await request.get('/apple-touch-icon.png')).body())).toEqual({
      width: 180,
      height: 180,
    });
  });

  test('the web manifest names the site and lists icons that exist', async ({ request }) => {
    const response = await request.get('/site.webmanifest');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/manifest\+json|application\/json/);
    const manifest = (await response.json()) as {
      name: string;
      start_url: string;
      theme_color: string;
      icons: { src: string; sizes: string; type: string; purpose?: string }[];
    };
    expect(manifest).toMatchObject({ name: 'Prajzo', start_url: '/', theme_color: '#0a1b46' });
    expect(manifest.icons.map((icon) => icon.sizes).sort()).toEqual([
      '192x192',
      '512x512',
      '512x512',
    ]);
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      const file = await request.get(icon.src);
      expect(file.status(), icon.src).toBe(200);
      const [width, height] = icon.sizes.split('x').map(Number);
      expect(pngSize(await file.body()), icon.src).toEqual({ width, height });
    }
    expect(manifest.icons.map((icon) => icon.src)).toContain(logoImagePath);
  });

  test('the picture shown when a page is shared is the right size and light enough to load in a chat', async ({
    request,
  }) => {
    const response = await request.get(sharingImage.path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    const bytes = await response.body();
    expect(pngSize(bytes)).toEqual({ width: sharingImage.width, height: sharingImage.height });
    expect(bytes.length).toBeLessThan(300 * 1024); // WhatsApp and others skip bigger previews
  });
});

test.describe('typefaces', () => {
  test('a page with prices downloads only the two Latin typefaces, once each, and uses them', async ({
    page,
  }) => {
    const fonts: string[] = [];
    page.on('response', (response) => {
      if (response.url().endsWith('.woff2')) fonts.push(new URL(response.url()).pathname);
    });
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Not the 100 KB of "Latin extended" that contains the rupee sign: that comes from the system.
    expect(fonts.sort()).toEqual([
      expect.stringMatching(/^\/assets\/inter-latin-wght-normal-[\w-]+\.woff2$/),
      expect.stringMatching(/^\/assets\/sora-latin-wght-normal-[\w-]+\.woff2$/),
    ]);
    expect(await page.evaluate(() => document.fonts.check('16px "Inter Variable"'))).toBe(true);
    expect(await page.evaluate(() => document.fonts.check('600 32px "Sora Variable"'))).toBe(true);
    await expect(page.getByText(/₹/).first()).toBeVisible();
  });
});
