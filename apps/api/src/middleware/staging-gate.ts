import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
/** Wrong guesses allowed per connection every 15 minutes. */
const MAX_WRONG_GUESSES = 20;

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Compares in constant time whatever the lengths: both sides are hashed to the same length. */
const matches = (given: string, expected: Buffer) => timingSafeEqual(digest(given), expected);

function readCredentials(header: string | undefined): { user: string; password: string } | null {
  const encoded = /^Basic +(\S+)$/i.exec(header ?? '')?.[1];
  if (!encoded) return null;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  // The password may contain colons itself; only the first one ends the user name.
  return colon < 0 ? null : { user: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
}

/** Monitors need to ask "are you running?" without a password. It reveals nothing else. */
const isHealthCheck = (req: Request) =>
  (req.method === 'GET' || req.method === 'HEAD') && req.path === '/api/health';

/**
 * Staging protection (D-037): asks for a user name and password (HTTP Basic authentication)
 * before serving anything at all, so people without them get no pages, no CSS, no scripts and
 * no API. Only used when STAGING_PASSWORD is set, which belongs on a staging site, never on the
 * live one.
 *
 * It keeps outsiders out. It can't stop someone who has the password from using their browser's
 * developer tools, which is why the Terms also say previews stay Prajzo's until paid.
 */
export function createStagingGate(options: { user: string; password: string }): RequestHandler {
  const expectedUser = digest(options.user);
  const expectedPassword = digest(options.password);

  // Only an attempt that carries a user name and password is a guess. The first request of a visit
  // has none (the browser hasn't been asked yet), and correct ones aren't counted.
  const limitWrongGuesses = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: MAX_WRONG_GUESSES,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => !req.headers.authorization,
    skipSuccessfulRequests: true,
    handler: (_req, res) => {
      res
        .status(429)
        .type('text/plain')
        .send('Too many wrong attempts. Please wait a few minutes and try again.');
    },
  });

  const check: RequestHandler = (req, res, next) => {
    const given = readCredentials(req.get('authorization'));
    // Both are always compared, so the answer doesn't reveal which one was wrong.
    const userMatches = given ? matches(given.user, expectedUser) : false;
    const passwordMatches = given ? matches(given.password, expectedPassword) : false;
    if (userMatches && passwordMatches) {
      next();
      return;
    }
    if (given) req.log.warn('Wrong staging user name or password');
    res
      .status(401)
      .set('WWW-Authenticate', 'Basic realm="Prajzo preview", charset="UTF-8"')
      .type('text/plain')
      .send('This preview is private. Sign in with the user name and password you were given.');
  };

  return (req, res, next) => {
    // Nothing from a private preview may be kept by a shared cache (such as a CDN) or indexed.
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    });
    if (isHealthCheck(req)) {
      next();
      return;
    }
    void limitWrongGuesses(req, res, (error?: unknown) => {
      if (error) next(error);
      else check(req, res, next);
    });
  };
}
