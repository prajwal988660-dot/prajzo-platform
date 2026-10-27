import type { UserRole } from '@prajzo/shared';
import MongoStore from 'connect-mongo';
import type { Request, RequestHandler, Response } from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import type { Collection, Document } from 'mongodb';
import type { Env } from '../../config/env';
import { escapeRegExp } from '../../lib/regex';

/** The sign-in cookie's name while developing, testing and hosting on your own computer. */
export const sessionCookieName = 'prajzo.sid';

/**
 * In production the cookie gets the `__Host-` prefix. Browsers then refuse it unless it is
 * `Secure`, covers the whole site (`Path=/`) and has no `Domain`, so a sibling address of the site
 * (another subdomain, a forgotten test site) can't plant a cookie that this site would believe.
 */
export const productionSessionCookieName = `__Host-${sessionCookieName}`;

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: UserRole;
    /** When the person signed in (milliseconds), for the limit on how long a session can last. */
    startedAt?: number;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface Sessions {
  /** What the sign-in cookie is called here. */
  cookieName: string;
  /** Whether the request carries a sign-in cookie (no database is needed to find that out). */
  hasCookie(req: Request): boolean;
  /** Asks the browser to forget the sign-in cookie. */
  clearCookie(res: Response): void;
  /**
   * Who is signed in: their id, or null for nobody. A session that has lasted longer than the
   * limit for its kind is ended here, however recently it was used (sessions are renewed by use,
   * so without this one in daily use would never end).
   */
  currentUserId(req: Request): Promise<string | null>;
  /** express-session, created on first use (it needs the database connection). */
  middleware: RequestHandler;
  /** Signs the person in: a brand-new session ID, so an old or planted ID can't be reused. */
  start(req: Request, user: { id: string; role: UserRole }): Promise<void>;
  /** Ends the current session. */
  end(req: Request): Promise<void>;
  /** Ends every session of a person, except `keepSessionId` (used after a password change). */
  endAllFor(userId: string, keepSessionId?: string): Promise<void>;
}

export function createSessions(env: Env): Sessions {
  const production = env.NODE_ENV === 'production';
  const cookieName = production ? productionSessionCookieName : sessionCookieName;
  const cookiePattern = new RegExp(`(?:^|;[ ]*)${escapeRegExp(cookieName)}=`);
  const customerMs = env.SESSION_TTL_DAYS * DAY_MS;
  const adminMs = env.ADMIN_SESSION_TTL_HOURS * HOUR_MS;
  const customerMaxMs = env.SESSION_MAX_DAYS * DAY_MS;
  const adminMaxMs = env.ADMIN_SESSION_MAX_HOURS * HOUR_MS;

  let store: MongoStore | undefined;
  let handler: RequestHandler | undefined;
  const ensure = () => {
    if (!store || !handler) {
      store = MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: 'sessions',
        // Stored as a document (not text) so sessions can be found by person.
        stringify: false,
        // Writes the "last seen" time at most every 5 minutes instead of on every request.
        touchAfter: 5 * 60,
        ttl: env.SESSION_TTL_DAYS * 24 * 60 * 60,
      });
      handler = session({
        name: cookieName,
        secret: env.SESSION_SECRET,
        store,
        resave: false,
        // No session (and no database write) for visitors who haven't signed in.
        saveUninitialized: false,
        // Each visit pushes the expiry forward, so the limits above are "since last visit".
        rolling: true,
        proxy: env.TRUST_PROXY ? true : undefined,
        cookie: {
          httpOnly: true, // page scripts can't read it
          sameSite: 'lax', // not sent with requests started by other websites
          secure: production, // https only in production
          maxAge: customerMs,
        },
      });
    }
    return { store, handler };
  };

  const end = async (req: Request) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error: unknown) => (error ? reject(asError(error)) : resolve()));
    });
  };

  return {
    cookieName,

    hasCookie: (req) => cookiePattern.test(req.headers.cookie ?? ''),

    clearCookie(res) {
      // A `__Host-` cookie can only be changed with the attributes it was set with.
      res.clearCookie(cookieName, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: production,
      });
    },

    async currentUserId(req) {
      const { userId, role, startedAt } = req.session;
      if (!userId) return null;
      const longest = role === 'admin' ? adminMaxMs : customerMaxMs;
      // A session with no start time was made before this limit existed: sign in again.
      if (startedAt === undefined || Date.now() - startedAt > longest) {
        await end(req);
        return null;
      }
      return userId;
    },

    middleware: (req, res, next) => ensure().handler(req, res, next),

    async start(req, user) {
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error: unknown) => (error ? reject(asError(error)) : resolve()));
      });
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.startedAt = Date.now();
      req.session.cookie.maxAge = user.role === 'admin' ? adminMs : customerMs;
      await new Promise<void>((resolve, reject) => {
        req.session.save((error: unknown) => (error ? reject(asError(error)) : resolve()));
      });
    },

    end,

    async endAllFor(userId, keepSessionId) {
      const collection = (await ensure().store.collectionP) as unknown as Collection<Document>;
      const filter: Record<string, unknown> = {
        'session.userId': userId,
        ...(keepSessionId ? { _id: { $ne: keepSessionId } } : {}),
      };
      await collection.deleteMany(filter);
    },
  };
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
