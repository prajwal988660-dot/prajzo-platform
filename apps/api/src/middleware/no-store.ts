import type { RequestHandler } from 'express';

/**
 * Private answers (who is signed in, a customer's projects) must never be kept by any cache. It
 * only fills a gap: a stricter rule set earlier, such as the staging gate's "private, no-store",
 * is left as it is.
 */
export const noStore: RequestHandler = (_req, res, next) => {
  if (!res.getHeader('Cache-Control')) res.set('Cache-Control', 'no-store');
  next();
};
