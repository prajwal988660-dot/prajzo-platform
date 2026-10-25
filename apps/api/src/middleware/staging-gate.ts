import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
/** Wrong guesses allowed per connection every 15 minutes. */
const MAX_WRONG_GUESSES = 20;
/** The most addresses remembered at once, so a flood of different ones can't use up the memory. */
const MAX_TRACKED_ADDRESSES = 10_000;

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

  /**
   * Wrong guesses, counted per address. Only a wrong guess is counted: the first request of every
   * visit (before the browser has been asked), correct requests, and whatever the site itself
   * answers afterwards (a missing file, a mistyped sign-in on the staging site) never use up the
   * allowance. Once an address has used it up, everything from it is refused until the time is
   * up, even the right password, so guessing can't go on.
   */
  const wrongGuesses = new Map<string, { count: number; until: number }>();

  const secondsBlocked = (address: string, now: number): number => {
    const record = wrongGuesses.get(address);
    if (!record) return 0;
    if (record.until <= now) {
      wrongGuesses.delete(address);
      return 0;
    }
    return record.count >= MAX_WRONG_GUESSES ? Math.ceil((record.until - now) / 1000) : 0;
  };

  const countWrongGuess = (address: string, now: number) => {
    const record = wrongGuesses.get(address);
    if (record && record.until > now) {
      record.count += 1;
      return;
    }
    if (wrongGuesses.size >= MAX_TRACKED_ADDRESSES) {
      for (const [key, entry] of wrongGuesses) if (entry.until <= now) wrongGuesses.delete(key);
      // Still full: forget the oldest.
      const oldest = wrongGuesses.keys().next();
      if (wrongGuesses.size >= MAX_TRACKED_ADDRESSES && !oldest.done) {
        wrongGuesses.delete(oldest.value);
      }
    }
    wrongGuesses.set(address, { count: 1, until: now + FIFTEEN_MINUTES });
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

    const address = req.ip ?? 'unknown';
    const now = Date.now();
    const wait = secondsBlocked(address, now);
    if (wait > 0) {
      res
        .status(429)
        .set('Retry-After', String(wait))
        .type('text/plain')
        .send('Too many wrong attempts. Please wait a few minutes and try again.');
      return;
    }

    const given = readCredentials(req.get('authorization'));
    // Both are always compared, so the answer doesn't reveal which one was wrong.
    const userMatches = given ? matches(given.user, expectedUser) : false;
    const passwordMatches = given ? matches(given.password, expectedPassword) : false;
    if (userMatches && passwordMatches) {
      next();
      return;
    }
    if (given) {
      countWrongGuess(address, now);
      req.log.warn('Wrong staging user name or password');
    }
    res
      .status(401)
      .set('WWW-Authenticate', 'Basic realm="Prajzo preview", charset="UTF-8"')
      .type('text/plain')
      .send('This preview is private. Sign in with the user name and password you were given.');
  };
}
