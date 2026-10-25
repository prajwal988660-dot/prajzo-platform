import { existsSync } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import compression from 'compression';
import express, { type Express } from 'express';
import { AppError } from '../lib/errors';
import type { Logger } from '../lib/logger';

/**
 * In production the API serves the built web app too, so the whole site runs on one address.
 * Must be registered after all /api routes.
 */
export function serveWebApp(app: Express, distDir: string, logger: Logger): void {
  const indexFile = path.join(distDir, 'index.html');
  if (!existsSync(indexFile)) {
    logger.warn({ distDir }, 'Web app build not found; only the API is being served');
    return;
  }

  // Smaller downloads for pages, scripts and styles (images and fonts are already compressed and
  // are left alone). Brotli at a moderate level is far smaller than gzip and quick enough to do
  // on the fly. Registered here, after the API, so it only ever applies to the website's files.
  app.use(compression({ brotli: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } } }));

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

  // Every other page is handled by the web app's router (including its "not found" page).
  app.get('/{*path}', (req, res, next) => {
    // Something that looks like a file (it has an extension, or it is hidden, like /.env) and was
    // not found above is not a page. It gets a real "not found", not the app with "200 OK".
    if (looksLikeAFile(req.path)) {
      next(new AppError(404, 'NOT_FOUND', 'Not found.'));
      return;
    }
    // A staging password has already set a stricter header (private, no-store); keep it.
    if (!res.getHeader('Cache-Control')) res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}

/** A path that names a file rather than a page of the app: "/logo.png", "/.env", "/a/b.sql". */
export function looksLikeAFile(requestPath: string): boolean {
  return /(^|\/)\.[^/]/.test(requestPath) || /\.[A-Za-z0-9]{1,10}$/.test(requestPath);
}
