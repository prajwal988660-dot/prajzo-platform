import {
  adminOverviewSchema,
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
  updateProfileRequestSchema,
  type AdminOverview,
  type OkResponse,
  type SessionResponse,
  type UserRole,
} from '@prajzo/shared';
import { Router, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { Env } from '../../config/env';
import { AppError } from '../../lib/errors';
import type { Logger } from '../../lib/logger';
import { noStore } from '../../middleware/no-store';
import { requireDatabase } from '../../middleware/require-database';
import type { Mailer } from '../../services/mailer';
import {
  adminOverview,
  authenticate,
  changePassword,
  completePasswordReset,
  findUserById,
  registerCustomer,
  startPasswordReset,
  toPublicUser,
  updateProfile,
} from './auth.service';
import { createGuards, currentUser } from './guards';
import { createSessions, hasSessionCookie, sessionCookieName } from './session';

export type AuthDeps = { env: Env; logger: Logger; mailer: Mailer };

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const wrongCredentials = () =>
  new AppError(
    401,
    'UNAUTHENTICATED',
    "That email and password don't match. Check them and try again.",
  );

function tooManyAttempts() {
  return new AppError(
    429,
    'RATE_LIMITED',
    'Too many attempts. Please wait a few minutes and try again.',
  );
}

function limiter(
  max: number,
  options: { failuresOnly?: boolean; key?: (req: Request) => string } = {},
) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options.failuresOnly ?? false,
    ...(options.key ? { keyGenerator: options.key } : {}),
    handler: (_req, _res, next) => next(tooManyAttempts()),
  });
}

const ok = (message: string): OkResponse => ({ ok: true, message });

/**
 * Sessions, sign-in and account routes. Everything here talks to the database, so each route
 * starts with `requireDatabase` (a quick, clear "unavailable" instead of a long wait).
 */
export function createAuthRouters(deps: AuthDeps) {
  const { env, logger, mailer } = deps;
  const sessions = createSessions(env);
  const { requireUser, requireAdmin } = createGuards(sessions);
  const max = env.AUTH_RATE_LIMIT_MAX;

  // Failed sign-ins are counted per connection and also per email address, so a guesser can't
  // get around the first limit by changing connection.
  const failedSignInsByConnection = limiter(max, { failuresOnly: true });
  const failedSignInsByEmail = limiter(max, {
    failuresOnly: true,
    key: (req) => {
      const email = (req.body as { email?: unknown } | undefined)?.email;
      return `email:${typeof email === 'string' ? email.trim().toLowerCase() : ''}`;
    },
  });
  const signUps = limiter(max);
  const resetRequests = limiter(max);

  const signedIn = (user: Parameters<typeof toPublicUser>[0]): SessionResponse => ({
    user: toPublicUser(user),
  });

  async function signIn(req: Request, res: Response, role: UserRole) {
    const input = loginRequestSchema.parse(req.body);
    const user = await authenticate(input.email, input.password, role);
    if (!user) {
      req.log.warn('Failed sign-in');
      throw wrongCredentials();
    }
    await sessions.start(req, { id: user.id, role: user.role });
    req.log.info({ userId: user.id, role }, 'Signed in');
    res.json(signedIn(user));
  }

  // ---------- /auth ----------
  const auth = Router();
  auth.use(noStore);

  auth.get(
    '/me',
    // Visitors without a session cookie are simply "not signed in": no database needed.
    (req, res, next) =>
      hasSessionCookie(req) ? next() : void res.json({ user: null } satisfies SessionResponse),
    requireDatabase,
    sessions.middleware,
    async (req, res) => {
      const userId = req.session.userId;
      const user = userId ? await findUserById(userId) : null;
      if (userId && (!user || user.status !== 'active')) await sessions.end(req);
      res.json(
        user && user.status === 'active'
          ? signedIn(user)
          : ({ user: null } satisfies SessionResponse),
      );
    },
  );

  auth.post('/register', requireDatabase, signUps, sessions.middleware, async (req, res) => {
    const input = registerRequestSchema.parse(req.body);
    const user = await registerCustomer(input);
    await sessions.start(req, { id: user.id, role: user.role });
    req.log.info({ userId: user.id }, 'Account created');
    res.status(201).json(signedIn(user));
  });

  auth.post(
    '/login',
    requireDatabase,
    failedSignInsByConnection,
    failedSignInsByEmail,
    sessions.middleware,
    (req, res) => signIn(req, res, 'customer'),
  );

  // Administrators sign in on their own page, with their own (shorter) session.
  auth.post(
    '/admin/login',
    requireDatabase,
    failedSignInsByConnection,
    failedSignInsByEmail,
    sessions.middleware,
    (req, res) => signIn(req, res, 'admin'),
  );

  auth.post(
    '/logout',
    (req, res, next) => {
      if (!hasSessionCookie(req)) {
        res.status(204).end();
        return;
      }
      next();
    },
    requireDatabase,
    sessions.middleware,
    async (req, res) => {
      await sessions.end(req);
      res.clearCookie(sessionCookieName, { path: '/' });
      res.status(204).end();
    },
  );

  auth.post('/password/forgot', requireDatabase, resetRequests, async (req, res) => {
    const input = forgotPasswordRequestSchema.parse(req.body);
    await startPasswordReset(input.email, { mailer, logger, appOrigin: env.APP_ORIGIN });
    res
      .status(202)
      .json(ok("If an account exists for that email, we've sent a link to reset the password."));
  });

  auth.post(
    '/password/reset',
    requireDatabase,
    resetRequests,
    sessions.middleware,
    async (req, res) => {
      const input = resetPasswordRequestSchema.parse(req.body);
      const userId = await completePasswordReset(input.token, input.password);
      await sessions.endAllFor(userId); // anyone signed in with the old password is signed out
      req.log.info({ userId }, 'Password reset');
      res.json(ok('Your password has been changed. You can now sign in.'));
    },
  );

  // ---------- /me ----------
  const me = Router();
  me.use(noStore, requireDatabase, sessions.middleware);

  me.patch('/', requireUser, async (req, res) => {
    const input = updateProfileRequestSchema.parse(req.body);
    const user = await updateProfile(currentUser(res.locals), input);
    res.json(signedIn(user));
  });

  me.post('/password', requireUser, async (req, res) => {
    const input = changePasswordRequestSchema.parse(req.body);
    const user = currentUser(res.locals);
    await changePassword(user.id, input.currentPassword, input.newPassword);
    await sessions.endAllFor(user.id, req.sessionID); // other devices are signed out
    req.log.info({ userId: user.id }, 'Password changed');
    res.json(ok('Your password has been changed. Other devices have been signed out.'));
  });

  // ---------- /admin ----------
  const admin = Router();
  admin.use(noStore, requireDatabase, sessions.middleware);

  admin.get('/overview', requireAdmin, async (_req, res) => {
    const overview: AdminOverview = adminOverviewSchema.parse(await adminOverview());
    res.json(overview);
  });

  return { auth, me, admin, sessions };
}
