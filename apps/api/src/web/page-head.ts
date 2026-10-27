import {
  defaultTitle,
  fullTitle,
  indexablePaths,
  kindOfAddress,
  logoImagePath,
  pageAt,
  pagePaths,
  sharingImage,
  siteContact,
  siteLinks,
  siteName,
  type PageMeta,
} from '@prajzo/shared';
import type { Logger } from '../lib/logger';

/** Where the page-specific part of the built index.html is (see apps/web/index.html). */
const startMarker = '<!--page-head-->';
const endMarker = '<!--/page-head-->';

export interface RenderedPage {
  /** 200 for a page of the website, 404 for an address that is nothing (the app shows its own page). */
  status: 200 | 404;
  html: string;
  /** Whether search engines are told to keep it out of their results. */
  noindex: boolean;
}

/** Makes text safe to put in HTML, including inside a quoted attribute. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** JSON that is safe inside a script tag: no "</script>" and no line separators can end it early. */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll(' ', '\\u2028')
    .replaceAll(' ', '\\u2029');
}

const meta = (name: string, content: string) =>
  `<meta name="${name}" content="${escapeHtml(content)}" />`;
const property = (name: string, content: string) =>
  `<meta property="${name}" content="${escapeHtml(content)}" />`;

/** What the home page tells search engines about the business (their "knowledge panel" source). */
function organizationData(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: siteName,
        url: `${origin}/`,
        logo: `${origin}${logoImagePath}`,
        email: siteContact.email,
        telephone: siteContact.phoneE164,
        sameAs: [siteLinks.instagram],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: siteName,
        url: `${origin}/`,
        publisher: { '@id': `${origin}/#organization` },
        inLanguage: 'en-IN',
      },
    ],
  };
}

/**
 * Writes the page-specific part of the head (title, description, address, sharing details) for
 * each address, so that crawlers and link previews, which don't run the web app, are told the right
 * things. The web app is the same file for every address; only this part changes.
 */
export function createPageRenderer(indexHtml: string, siteOrigin: string, logger: Logger) {
  const origin = new URL(siteOrigin).origin;
  const start = indexHtml.indexOf(startMarker);
  const end = indexHtml.indexOf(endMarker);
  const hasMarkers = start >= 0 && end > start;
  if (!hasMarkers) {
    logger.error(
      `index.html has no ${startMarker} ... ${endMarker} block, so every page is sent with the ` +
        'same title and description. Rebuild the web app (apps/web/index.html defines the block).',
    );
  }
  const before = hasMarkers ? indexHtml.slice(0, start) : indexHtml;
  const after = hasMarkers ? indexHtml.slice(end + endMarker.length) : '';

  const around = (head: string): string => (hasMarkers ? `${before}${head}${after}` : indexHtml);
  const addressOf = (path: string) => new URL(path, origin).href;

  /** A page that search engines may list, with everything needed to share it. */
  function listed(path: string, page: PageMeta): string {
    const title = fullTitle(page.name);
    const address = addressOf(path);
    const image = `${origin}${sharingImage.path}`;
    return [
      `<title>${escapeHtml(title)}</title>`,
      meta('description', page.description),
      `<link rel="canonical" href="${escapeHtml(address)}" />`,
      property('og:type', 'website'),
      property('og:site_name', siteName),
      property('og:locale', 'en_IN'),
      property('og:title', title),
      property('og:description', page.description),
      property('og:url', address),
      property('og:image', image),
      property('og:image:width', String(sharingImage.width)),
      property('og:image:height', String(sharingImage.height)),
      property('og:image:alt', sharingImage.alt),
      meta('twitter:card', 'summary_large_image'),
      meta('twitter:title', title),
      meta('twitter:description', page.description),
      meta('twitter:image', image),
      meta('twitter:image:alt', sharingImage.alt),
      ...(path === '/'
        ? [`<script type="application/ld+json">${jsonForScript(organizationData(origin))}</script>`]
        : []),
    ].join('\n    ');
  }

  /** A page that exists but must stay out of search results. */
  function unlisted(title: string, description: string): string {
    return [
      `<title>${escapeHtml(title)}</title>`,
      meta('description', description),
      meta('robots', 'noindex, nofollow'),
    ].join('\n    ');
  }

  // Everything is known in advance, so each is written once, when the server starts.
  const pages = new Map<string, RenderedPage>();
  for (const path of pagePaths) {
    const page = pageAt(path);
    if (!page) continue;
    pages.set(path, {
      status: 200,
      noindex: !page.index,
      html: around(
        page.index ? listed(path, page) : unlisted(fullTitle(page.name), page.description),
      ),
    });
  }
  const privateArea: RenderedPage = {
    status: 200,
    noindex: true,
    html: around(unlisted(defaultTitle, 'This part of the Prajzo website is private.')),
  };
  const notFound: RenderedPage = {
    status: 404,
    noindex: true,
    html: around(
      unlisted(
        fullTitle('Page not found'),
        "That page doesn't exist. Use the menu to find your way.",
      ),
    ),
  };

  return {
    origin,

    /** The page to send for this address. */
    render(pathname: string): RenderedPage {
      const kind = kindOfAddress(pathname);
      if (kind === 'private') return privateArea;
      if (kind === 'unknown') return notFound;
      return pages.get(pageAt(pathname)?.path ?? '') ?? notFound;
    },

    /** robots.txt: everyone may read the site, but not the API. Points to the sitemap. */
    robotsTxt(): string {
      return [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        '',
        `Sitemap: ${origin}/sitemap.xml`,
        '',
      ].join('\n');
    },

    /** sitemap.xml: the pages worth listing, and only those. No made-up "last changed" dates. */
    sitemapXml(): string {
      const urls = indexablePaths.map(
        (path) => `  <url><loc>${escapeHtml(addressOf(path))}</loc></url>`,
      );
      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
      ].join('\n');
    },
  };
}
