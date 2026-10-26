import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import compression from 'compression';
import express, { type Express, type Response } from 'express';
import { AppError } from '../lib/errors';
import type { Logger } from '../lib/logger';
import { createPageRenderer } from './page-head';

/**
 * In production the API serves the built web app too, so the whole site runs on one address.
 * Must be registered after all /api routes. `origin` is the public address of the website
 * (APP_ORIGIN): search engines and link previews are told it, in robots.txt, the sitemap and
 * each page's head.
 */
export function serveWebApp(
  app: Express,
  distDir: string,
  logger: Logger,
  { origin }: { origin: string },
): void {
  const indexFile = path.join(distDir, 'index.html');
  if (!existsSync(indexFile)) {
    logger.warn({ distDir }, 'Web app build not found; only the API is being served');
    return;
  }
  const pages = createPageRenderer(readFileSync(indexFile, 'utf8'), origin, logger);

  // Smaller downloads for pages, scripts and styles (images and fonts are already compressed and
  // are left alone). Brotli at a moderate level is far smaller than gzip and quick enough to do
  // on the fly. Registered here, after the API, so it only ever applies to the website's files.
  app.use(compression({ brotli: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } } }));

  // For search engines. Written from the public address, so they are right wherever the site runs.
  app.get('/robots.txt', (_req, res) => {
    keepFresh(res);
    res.type('text/plain').send(pages.robotsTxt());
  });
  app.get('/sitemap.xml', (_req, res) => {
    keepFresh(res);
    res.type('application/xml').send(pages.sitemapXml());
  });

  // Vite puts content-hashed files in /assets, so they can be cached for a year.
  app.use(
    '/assets',
    express.static(path.join(distDir, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: false,
    }),
  );
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));

  // Every other address opens the web app, which shows the page (or its own "not found" page). The
  // server only decides what the page is called, and says so honestly: an address that is nothing
  // is answered with 404, so search engines don't keep it.
  app.get('/{*path}', (req, res, next) => {
    // Something that looks like a file (it has an extension, or it is hidden, like /.env) and was
    // not found above is not a page. It gets a real "not found", not the app with "200 OK".
    if (looksLikeAFile(req.path)) {
      next(new AppError(404, 'NOT_FOUND', 'Not found.'));
      return;
    }
    const page = pages.render(req.path);
    keepFresh(res);
    if (page.noindex) res.set('X-Robots-Tag', 'noindex, nofollow');
    res.status(page.status).type('html').send(page.html);
  });
}

/** Pages are always checked again before being reused, so a new version shows at once. */
function keepFresh(res: Response): void {
  // A staging password has already set a stricter header (private, no-store); keep it.
  if (!res.getHeader('Cache-Control')) res.set('Cache-Control', 'no-cache');
}

/** A path that names a file rather than a page of the app: "/logo.png", "/.env", "/a/b.sql". */
export function looksLikeAFile(requestPath: string): boolean {
  return /(^|\/)\.[^/]/.test(requestPath) || /\.[A-Za-z0-9]{1,10}$/.test(requestPath);
}
