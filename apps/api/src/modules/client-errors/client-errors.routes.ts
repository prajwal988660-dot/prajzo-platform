import { clientErrorReportSchema } from '@prajzo/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../../lib/errors';

type ClientErrorsRouterOptions = {
  /** Reports allowed per connection every 15 minutes. */
  rateLimitMax: number;
};

/**
 * Crashes in visitors' browsers (D-058). Each report becomes one warning in the server log, with
 * the request id and the browser's user agent; nothing is stored in the database. A browser in a
 * crash loop, or someone posting junk, quickly reaches the limit and is then only refused.
 */
export function clientErrorsRouter({ rateLimitMax }: ClientErrorsRouterOptions): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError(429, 'RATE_LIMITED', 'Too many error reports from your connection.'));
    },
  });

  router.post('/client-errors', limiter, (req, res) => {
    const report = clientErrorReportSchema.parse(req.body);
    req.log.warn(
      { clientError: report, userAgent: req.get('user-agent')?.slice(0, 300) },
      "A visitor's browser reported an error",
    );
    res.status(204).end();
  });

  return router;
}
