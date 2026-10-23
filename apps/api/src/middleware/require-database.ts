import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors';

/**
 * For routes that read or write the database. While the database is unreachable (for example
 * when Atlas does not know the computer's current internet address), the request fails at once
 * with a clear message instead of hanging for ten seconds and then reporting a vague error.
 */
export const requireDatabase: RequestHandler = (_req, _res, next) => {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    next();
    return;
  }
  next(
    new AppError(
      503,
      'SERVICE_UNAVAILABLE',
      'This part of the site is temporarily unavailable. Please try again in a minute, or message us on WhatsApp.',
    ),
  );
};
