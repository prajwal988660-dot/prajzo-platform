import {
  indexablePaths,
  logoImagePath,
  pagePaths,
  sharingImage,
  siteContact,
  sitePages,
} from '@prajzo/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../lib/logger';
import { createPageRenderer, escapeHtml } from './page-head';

const shell = `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="UTF-8" />
    <!--page-head-->
    <title>Default title</title>
    <meta name="description" content="Default description" />
    <!--/page-head-->
    <meta name="theme-color" content="#0a1b46" />
  </head>
  <body><div id="root"></div></body>
</html>`;

const origin = 'https://prajzo.example';
const quietLogger = () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() });
const rendererFor = (html = shell, site = origin) => {
  const logger = quietLogger();
  return { logger, renderer: createPageRenderer(html, site, logger as unknown as Logger) };
};

const signInPages = ['/login', '/register', '/forgot-password', '/reset-password'] as const;

/** The content of one tag of a page, such as the description, or undefined. */
const tag = (html: string, kind: 'name' | 'property', name: string) =>
  new RegExp(`<meta ${kind}="${name}" content="([^"]*)" />`).exec(html)?.[1];

describe('the head of each page of the website', () => {
  const { renderer } = rendererFor();

  it.each(indexablePaths)('tells search engines and link previews about %s', (path) => {
    const { html, status, noindex } = renderer.render(path);
    const page = sitePages[path];
    const title = 'name' in page ? `${page.name} · Prajzo` : 'Prajzo · Web development studio';
    const address = `${origin}${path}`;

    expect(status).toBe(200);
    expect(noindex).toBe(false);
    expect(html).toContain(`<title>${escapeHtml(title)}</title>`);
    expect(tag(html, 'name', 'description')).toBe(escapeHtml(page.description));
    expect(html).toContain(`<link rel="canonical" href="${address}" />`);
    expect(tag(html, 'property', 'og:url')).toBe(address);
    expect(tag(html, 'property', 'og:title')).toBe(escapeHtml(title));
    expect(tag(html, 'property', 'og:description')).toBe(escapeHtml(page.description));
    expect(tag(html, 'property', 'og:type')).toBe('website');
    expect(tag(html, 'property', 'og:site_name')).toBe('Prajzo');
    expect(tag(html, 'name', 'twitter:card')).toBe('summary_large_image');
    expect(tag(html, 'name', 'twitter:title')).toBe(escapeHtml(title));
    expect(tag(html, 'name', 'twitter:description')).toBe(escapeHtml(page.description));
    // The page's own details replace the shell's, they are not added next to them.
    expect(html).not.toContain('Default title');
    expect(html).not.toContain('Default description');
    expect(html).not.toContain('name="robots"');
  });

  it('gives a shared link a picture with a full web address, its size, and a description of it', () => {
    const { html } = renderer.render('/services');
    expect(tag(html, 'property', 'og:image')).toBe(`${origin}/og-image.png`);
    expect(tag(html, 'property', 'og:image:width')).toBe(String(sharingImage.width));
    expect(tag(html, 'property', 'og:image:height')).toBe(String(sharingImage.height));
    expect(tag(html, 'property', 'og:image:alt')).toBe(sharingImage.alt);
    expect(tag(html, 'name', 'twitter:image')).toBe(`${origin}/og-image.png`);
    expect(tag(html, 'name', 'twitter:image:alt')).toBe(sharingImage.alt);
  });

  it('leaves the rest of the page as the build made it', () => {
    const { html } = renderer.render('/pricing');
    expect(html).toContain('<meta charset="UTF-8" />');
    expect(html).toContain('<meta name="theme-color" content="#0a1b46" />');
    expect(html).toContain('<div id="root"></div>');
    expect(html).not.toContain('<!--page-head-->');
  });

  it('treats capital letters, a closing slash and a query as the same page', () => {
    const same = renderer.render('/services').html;
    for (const variant of [
      '/Services',
      '/services/',
      '/services?utm_source=x',
      '/SERVICES/?a=1#b',
    ]) {
      expect(renderer.render(variant).html, variant).toBe(same);
    }
  });

  it('describes the business to search engines on the home page, and only there', () => {
    const jsonLd = (html: string) => [
      ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs),
    ];

    for (const path of pagePaths) {
      expect(jsonLd(renderer.render(path).html), path).toHaveLength(path === '/' ? 1 : 0);
    }
    const data = JSON.parse(jsonLd(renderer.render('/').html)[0]?.[1] ?? '') as {
      '@graph': Record<string, unknown>[];
    };
    const organization = data['@graph'].find((item) => item['@type'] === 'Organization');
    const website = data['@graph'].find((item) => item['@type'] === 'WebSite');
    expect(organization).toMatchObject({
      name: 'Prajzo',
      url: `${origin}/`,
      logo: `${origin}${logoImagePath}`,
      email: siteContact.email,
      telephone: siteContact.phoneE164,
    });
    expect(website).toMatchObject({ name: 'Prajzo', url: `${origin}/`, inLanguage: 'en-IN' });
  });

  it('makes nothing up: no address, opening hours, ratings or prices in the structured data', () => {
    const html = renderer.render('/').html;
    for (const invented of [
      'address',
      'openingHours',
      'aggregateRating',
      'review',
      'priceRange',
      'areaServed',
    ]) {
      expect(html, invented).not.toContain(`"${invented}"`);
    }
  });

  it.each(signInPages)(
    'keeps %s out of search results, with no canonical address or sharing details',
    (path) => {
      const { html, status, noindex } = renderer.render(path);
      expect(status).toBe(200);
      expect(noindex).toBe(true);
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
      expect(html).not.toContain('rel="canonical"');
      expect(html).not.toContain('og:');
      expect(html).toContain(`<title>${escapeHtml(`${sitePages[path].name} · Prajzo`)}</title>`);
    },
  );

  it.each([
    '/account',
    '/account/projects',
    '/account/projects/PRZ-2026-0001',
    '/admin',
    '/admin/projects/PRZ-1',
  ])('opens the app for the private address %s, and keeps it out of search results', (path) => {
    const { html, status, noindex } = renderer.render(path);
    expect(status).toBe(200);
    expect(noindex).toBe(true);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain('<title>Prajzo · Web development studio</title>');
  });

  it.each([
    '/no-such-page',
    '/templates/portfolio',
    '/accounts',
    '/administrator',
    '/dev/ui',
    '/services/extra',
  ])('answers 404 for %s, which is nothing, and keeps it out of search results', (path) => {
    const { html, status, noindex } = renderer.render(path);
    expect(status).toBe(404);
    expect(noindex).toBe(true);
    expect(html).toContain('<title>Page not found · Prajzo</title>');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain('<div id="root"></div>'); // the app still starts, and shows its own page
    expect(html).not.toContain('rel="canonical"');
  });

  it('uses only the address of the website, wherever APP_ORIGIN points', () => {
    for (const site of [`${origin}/`, `${origin}/some/path?x=1`, 'https://prajzo.example:443']) {
      const { renderer: other } = rendererFor(shell, site);
      expect(other.render('/pricing').html, site).toContain(
        '<link rel="canonical" href="https://prajzo.example/pricing" />',
      );
    }
    const { renderer: local } = rendererFor(shell, 'http://localhost:8080');
    expect(local.render('/').html).toContain(
      '<link rel="canonical" href="http://localhost:8080/" />',
    );
  });

  it('says so, once, when the page has no block to fill, and sends it unchanged', () => {
    const noBlock = '<!doctype html><title>Plain</title><div id="root"></div>';
    const { renderer: plain, logger } = rendererFor(noBlock);

    expect(plain.render('/services').html).toBe(noBlock);
    expect(plain.render('/account').html).toBe(noBlock);
    expect(plain.render('/nothing').status).toBe(404); // the status is still right
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(String(logger.error.mock.calls[0]?.[0])).toContain('<!--page-head-->');
  });
});

describe('robots.txt', () => {
  const { renderer } = rendererFor();

  it('lets everyone read the site except the API, and points to the sitemap', () => {
    const lines = renderer.robotsTxt().trim().split('\n');
    expect(lines).toEqual([
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
    ]);
  });

  it('does not announce where the private areas are', () => {
    const text = renderer.robotsTxt();
    expect(text).not.toMatch(/admin|account/i);
  });
});

describe('sitemap.xml', () => {
  const { renderer } = rendererFor();
  const addresses = () =>
    [...renderer.sitemapXml().matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  it('lists the pages worth listing, with full addresses, and only those', () => {
    expect(addresses()).toEqual(indexablePaths.map((path) => `${origin}${path}`));
    expect(addresses()).toContain(`${origin}/`);
    expect(addresses()).toContain(`${origin}/services`);
  });

  it('leaves out sign-in pages and private areas', () => {
    const xml = renderer.sitemapXml();
    for (const left of [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/account',
      '/admin',
      '/api',
    ]) {
      expect(xml, left).not.toContain(`${origin}${left}`);
    }
  });

  it('is well-formed, and invents no "last changed" dates', () => {
    const xml = renderer.sitemapXml();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
    expect(xml.match(/<url>/g)).toHaveLength(indexablePaths.length);
    expect(xml.match(/<\/url>/g)).toHaveLength(indexablePaths.length);
    expect(xml).not.toContain('<lastmod>');
  });
});

describe('escapeHtml', () => {
  it('makes text safe for HTML, including inside quotes', () => {
    expect(escapeHtml(`<script>alert("x" & 'y')</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;',
    );
    expect(escapeHtml('Plain text, with a comma.')).toBe('Plain text, with a comma.');
  });
});
