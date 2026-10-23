import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Blocks requests that change data when they were started by a different website.
 *
 * Browsers attach an `Origin` header to such requests. It must name this same site (compared
 * with the address the request was sent to), or the configured public address. Requests with no
 * Origin come from tools such as curl, which can't be used to ride on someone's cookies.
 * Together with `SameSite=Lax` cookies and JSON-only bodies, this stops cross-site request forgery.
 */
export function originCheck(appOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (safeMethods.has(req.method)) {
      next();
      return;
    }
    const origin = req.get('origin');
    if (!origin) {
      next();
      return;
    }
    try {
      if (new URL(origin).host === req.host || origin === appOrigin) {
        next();
        return;
      }
    } catch {
      // an unreadable Origin is treated like a foreign one
    }
    next(new AppError(403, 'FORBIDDEN', 'This request came from another website and was blocked.'));
  };
}
