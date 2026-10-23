import {
  paginationQuerySchema,
  projectActionRequestSchema,
  projectListSchema,
  projectRequestSchema,
  type ProjectResponse,
} from '@prajzo/shared';
import { Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { describeError } from '../../db/connection';
import { AppError } from '../../lib/errors';
import { noStore } from '../../middleware/no-store';
import { requireDatabase } from '../../middleware/require-database';
import type { Mailer } from '../../services/mailer';
import { createGuards, currentUser } from '../auth/guards';
import type { Sessions } from '../auth/session';
import { confirmationEmail, notificationEmail } from './project-request.emails';
import {
  cancelOwnProject,
  createProjectRequest,
  getOwnProject,
  listOwnProjects,
  toProjectDetail,
} from './project-request.service';

type ProjectRequestRouterOptions = {
  sessions: Sessions;
  mailer: Mailer;
  /** Where new-request notifications go. */
  notifyEmail: string;
  /** The website's public address, for the link in the customer's email. */
  appOrigin: string;
  /** Requests one customer may send per hour. */
  rateLimitMax: number;
};

/** The :reference in the address. Anything but plain text counts as "not found". */
const referenceOf = (req: Request): string => {
  const value = req.params.reference;
  return typeof value === 'string' ? value : '';
};

/**
 * A customer's project requests: send one, list them, read one, and cancel one while it is still
 * early. Everything here is for signed-in customers and only ever touches their own projects.
 */
export function projectRequestRouter({
  sessions,
  mailer,
  notifyEmail,
  appOrigin,
  rateLimitMax,
}: ProjectRequestRouterOptions): Router {
  const router = Router();
  const { requireCustomer } = createGuards(sessions);
  router.use(noStore, requireDatabase, sessions.middleware);

  // Counted per customer (the guard runs first), so one customer can't use up anyone else's turn.
  const limitSending = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (_req, res) => currentUser(res.locals as Record<string, unknown>).id,
    handler: (_req, _res, next) => {
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          "You've sent a lot of project requests in the last hour. Please wait a while before sending another, or contact us.",
        ),
      );
    },
  });

  router.post('/', requireCustomer, limitSending, async (req, res) => {
    const customer = currentUser(res.locals);
    const input = projectRequestSchema.parse(req.body);
    const project = await createProjectRequest(customer, input);
    req.log.info({ userId: customer.id, reference: project.reference }, 'Project request received');

    // The request is safely stored, so a failed email must not fail it (or keep the customer waiting).
    void Promise.allSettled([
      mailer.send(confirmationEmail(project, appOrigin)),
      mailer.send(notificationEmail(project, notifyEmail)),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          req.log.error(
            { reason: describeError(result.reason), reference: project.reference },
            'Project request email failed',
          );
        }
      }
    });

    const body: ProjectResponse = { project: toProjectDetail(project) };
    res.status(201).json(body);
  });

  router.get('/', requireCustomer, async (req, res) => {
    const query = paginationQuerySchema.parse(req.query);
    res.json(projectListSchema.parse(await listOwnProjects(currentUser(res.locals), query)));
  });

  router.get('/:reference', requireCustomer, async (req, res) => {
    const project = await getOwnProject(currentUser(res.locals), referenceOf(req));
    const body: ProjectResponse = { project: toProjectDetail(project) };
    res.json(body);
  });

  router.post('/:reference/actions', requireCustomer, async (req, res) => {
    const customer = currentUser(res.locals);
    const input = projectActionRequestSchema.parse(req.body);
    // "Cancel" is the only action a customer can take so far; the others arrive with Phase 5.
    const project = await cancelOwnProject(customer, referenceOf(req), input.note);
    req.log.info({ userId: customer.id, reference: project.reference }, 'Project cancelled');
    const body: ProjectResponse = { project: toProjectDetail(project) };
    res.json(body);
  });

  return router;
}
