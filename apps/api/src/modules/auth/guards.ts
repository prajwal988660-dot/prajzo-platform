import type { Request, RequestHandler } from 'express';
import { AppError } from '../../lib/errors';
import { findUserById } from './auth.service';
import type { Sessions } from './session';
import type { UserDocument } from './user.model';

/** The person making the request, set by `requireUser` / `requireAdmin`. */
export function currentUser(locals: Record<string, unknown>): UserDocument {
  const user = locals.user as UserDocument | undefined;
  if (!user) throw new Error('currentUser was used on a route without requireUser');
  return user;
}

/**
 * The rule for every private route, checked on the server for every request (hiding a link in
 * the web app is not security). The person is loaded fresh each time, so disabling an account
 * or changing a role takes effect immediately.
 */
export function createGuards(sessions: Sessions): {
  requireUser: RequestHandler;
  requireCustomer: RequestHandler;
  requireAdmin: RequestHandler;
} {
  async function signedInUser(req: Request): Promise<UserDocument> {
    const userId = await sessions.currentUserId(req); // null too once a session is too old
    const user = userId ? await findUserById(userId) : null;
    if (!user || user.status !== 'active') {
      if (userId) await sessions.end(req); // the account is gone or disabled
      throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    return user;
  }

  const requireUser: RequestHandler = async (req, res, next) => {
    res.locals.user = await signedInUser(req);
    next();
  };

  /** For things only customers do, such as sending a project request. Admins are refused. */
  const requireCustomer: RequestHandler = async (req, res, next) => {
    const user = await signedInUser(req);
    if (user.role !== 'customer') {
      throw new AppError(403, 'FORBIDDEN', 'This is only available to customer accounts.');
    }
    res.locals.user = user;
    next();
  };

  const requireAdmin: RequestHandler = async (req, res, next) => {
    const user = await signedInUser(req);
    if (user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', "You don't have access to this.");
    }
    res.locals.user = user;
    next();
  };

  return { requireUser, requireCustomer, requireAdmin };
}
