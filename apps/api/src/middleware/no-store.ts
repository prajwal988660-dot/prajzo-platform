import type { RequestHandler } from 'express';

/** Private answers (who is signed in, a customer's projects) must never be kept by any cache. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
