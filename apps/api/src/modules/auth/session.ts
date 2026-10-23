import type { UserRole } from '@prajzo/shared';
import MongoStore from 'connect-mongo';
import type { Request, RequestHandler } from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import type { Collection, Document } from 'mongodb';
import type { Env } from '../../config/env';

export const sessionCookieName = 'prajzo.sid';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: UserRole;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function hasSessionCookie(req: Request): boolean {
  return new RegExp(`(?:^|;\\s*)${sessionCookieName.replace('.', '\\.')}=`).test(
    req.headers.cookie ?? '',
  );
}

export interface Sessions {
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
  const customerMs = env.SESSION_TTL_DAYS * DAY_MS;
  const adminMs = env.ADMIN_SESSION_TTL_HOURS * HOUR_MS;

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
        name: sessionCookieName,
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
          secure: env.NODE_ENV === 'production', // https only in production
          maxAge: customerMs,
        },
      });
    }
    return { store, handler };
  };

  return {
    middleware: (req, res, next) => ensure().handler(req, res, next),

    async start(req, user) {
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error: unknown) => (error ? reject(asError(error)) : resolve()));
      });
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.cookie.maxAge = user.role === 'admin' ? adminMs : customerMs;
      await new Promise<void>((resolve, reject) => {
        req.session.save((error: unknown) => (error ? reject(asError(error)) : resolve()));
      });
    },

    async end(req) {
      await new Promise<void>((resolve, reject) => {
        req.session.destroy((error: unknown) => (error ? reject(asError(error)) : resolve()));
      });
    },

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
