import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors';
import type { Logger } from '../lib/logger';

const ONE_MINUTE = 60 * 1000;
const FIFTEEN_MINUTES = 15 * ONE_MINUTE;

/**
 * The overall limit for the API: no connection may make more than `max` requests of any kind in
 * a minute. The limits on sign-in, contact and project requests are much stricter and sit on
 * their own routes; this one only stops one visitor, script or scanner from using up the
 * database for everyone else. It goes on `/api`, ahead of the request body being read.
 *
 * The plain health check ("is the process up?") is never limited: it costs nothing, and a host
 * that restarts a site whose health check is refused must not be able to make that happen by
 * flooding it. Its readiness twin, which asks the database, is limited like everything else.
 */
export function apiRateLimit(max: number): RequestHandler {
  return rateLimit({
    windowMs: ONE_MINUTE,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Mounted on /api, so the path here is relative to that.
    skip: (req) => (req.method === 'GET' || req.method === 'HEAD') && req.path === '/health',
    handler: (_req, _res, next) =>
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          'Too many requests from your connection. Please wait a minute and try again.',
        ),
      ),
  });
}

/**
 * The limit for the admin area, counted per administrator rather than per connection, so a stolen
 * sign-in can't be used to read or change everything in one go, wherever it is used from. It must
 * come after the check that the person is an administrator: requests from people who aren't signed
 * in never reach it, so nobody can use up an administrator's allowance from outside.
 */
export function adminRateLimit(max: number): RequestHandler {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (_req: Request, res) => {
      const user = res.locals.user as { id?: unknown } | undefined;
      if (typeof user?.id !== 'string') {
        throw new Error('adminRateLimit was used on a route without requireAdmin before it');
      }
      return `admin:${user.id}`;
    },
    handler: (_req, _res, next) =>
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          'Too many requests from this account. Please wait a few minutes and try again.',
        ),
      ),
  });
}

/**
 * Both ways the proxy setting (`TRUST_PROXY`) can be wrong are silent and bad, so in production
 * the first request that shows one is logged, once each:
 *
 * - Behind a proxy with the setting off, every visitor looks like the proxy: they all share one
 *   allowance for every limit above, and one busy visitor locks everyone out.
 * - With no proxy but the setting on, a visitor can claim to be any address and so never reach a
 *   limit.
 *
 * Health checks are ignored: a host often asks those directly, without its proxy.
 */
export function proxyCheck(
  { NODE_ENV, TRUST_PROXY }: { NODE_ENV: string; TRUST_PROXY: boolean },
  logger: Pick<Logger, 'warn'>,
): RequestHandler {
  if (NODE_ENV !== 'production') return (_req, _res, next) => next();
  let warnedAboutHiddenVisitors = false;
  let warnedAboutPretending = false;
  return (req, _res, next) => {
    if (!req.path.startsWith('/api/health')) {
      const forwarded = Boolean(req.headers['x-forwarded-for']);
      if (forwarded && !TRUST_PROXY && !warnedAboutHiddenVisitors) {
        warnedAboutHiddenVisitors = true;
        logger.warn(
          'Requests arrive with an X-Forwarded-For header, which means the site is behind a ' +
            'proxy, but TRUST_PROXY is off. Every visitor looks like the proxy, so they all ' +
            'share one allowance for every rate limit. Set TRUST_PROXY=true (docs/ENVIRONMENT.md). ' +
            'This message is shown once.',
        );
      }
      if (!forwarded && TRUST_PROXY && !warnedAboutPretending) {
        warnedAboutPretending = true;
        logger.warn(
          'A request arrived with no X-Forwarded-For header although TRUST_PROXY is on. If the ' +
            "site can be reached directly, not only through your host's proxy, visitors can " +
            'pretend to be any address and get around the rate limits (docs/ENVIRONMENT.md). ' +
            'This message is shown once.',
        );
      }
    }
    next();
  };
}
