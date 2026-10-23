import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
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
  app.get('/{*path}', (_req, res) => {
    // A staging password has already set a stricter header (private, no-store); keep it.
    if (!res.getHeader('Cache-Control')) res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}
