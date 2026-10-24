import {
  formatRupees,
  paginationQuerySchema,
  projectActionRequestSchema,
  projectListSchema,
  projectRequestSchema,
  type ProjectResponse,
} from '@prajzo/shared';
import { Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../../lib/errors';
import { noStore } from '../../middleware/no-store';
import { requireDatabase } from '../../middleware/require-database';
import { createGuards, currentUser } from '../auth/guards';
import type { Sessions } from '../auth/session';
import type { ProjectEffects } from './project-effects';
import type { ProjectRequestDocument } from './project-request.model';
import {
  acceptQuote,
  cancelOwnProject,
  createProjectRequest,
  declineQuote,
  getOwnProject,
  listOwnProjects,
  replyToQuestion,
  requestRevision,
  signOff,
} from './project-request.service';
import { toProjectDetail } from './project-view';

type ProjectRequestRouterOptions = {
  sessions: Sessions;
  effects: ProjectEffects;
  /** Requests one customer may send per hour. */
  rateLimitMax: number;
  /** Things one customer may do to their projects per hour. */
  actionRateLimitMax: number;
};

/** The :reference in the address. Anything but plain text counts as "not found". */
const referenceOf = (req: Request): string => {
  const value = req.params.reference;
  return typeof value === 'string' ? value : '';
};

/**
 * A customer's project requests: send one, list them, read one, and act on one (accept or
 * decline a quote, answer a question, ask for a revision, say it looks good, or cancel while it
 * is still early). Everything here is for signed-in customers and only ever touches their own
 * projects.
 */
export function projectRequestRouter({
  sessions,
  effects,
  rateLimitMax,
  actionRateLimitMax,
}: ProjectRequestRouterOptions): Router {
  const router = Router();
  const { requireCustomer } = createGuards(sessions);
  router.use(noStore, requireDatabase, sessions.middleware);

  // Counted per customer (the guard runs first), so one customer can't use up anyone else's turn.
  const perCustomer = (limit: number, windowMs: number, message: string) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: (_req, res) => currentUser(res.locals as Record<string, unknown>).id,
      handler: (_req, _res, next) => {
        next(new AppError(429, 'RATE_LIMITED', message));
      },
    });
  const limitSending = perCustomer(
    rateLimitMax,
    60 * 60 * 1000,
    "You've sent a lot of project requests in the last hour. Please wait a while before sending another, or contact us.",
  );
  const limitActions = perCustomer(
    actionRateLimitMax,
    60 * 60 * 1000,
    "You've done a lot in the last hour. Please wait a little, or contact us if something is urgent.",
  );

  router.post('/', requireCustomer, limitSending, async (req, res) => {
    const customer = currentUser(res.locals);
    const input = projectRequestSchema.parse(req.body);
    const project = await createProjectRequest(customer, input);
    req.log.info({ userId: customer.id, reference: project.reference }, 'Project request received');
    await effects.projectSent(req, customer, project);

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

  router.post('/:reference/actions', requireCustomer, limitActions, async (req, res) => {
    const customer = currentUser(res.locals);
    const reference = referenceOf(req);
    const input = projectActionRequestSchema.parse(req.body);

    let project: ProjectRequestDocument;
    switch (input.action) {
      case 'cancel':
        project = await cancelOwnProject(customer, reference, input.note);
        await effects.customerDid(req, customer, project, 'cancelled', input.note);
        break;
      case 'accept-quote': {
        project = await acceptQuote(customer, reference, input.quoteVersion);
        const quote = project.quotes.find((item) => item.version === input.quoteVersion);
        await effects.customerDid(
          req,
          customer,
          project,
          'accepted-quote',
          quote ? `Quote version ${quote.version}: ${formatRupees(quote.amountPaise)}` : undefined,
        );
        break;
      }
      case 'decline-quote':
        project = await declineQuote(customer, reference, input.quoteVersion, input.note);
        await effects.customerDid(req, customer, project, 'declined-quote', input.note);
        break;
      case 'reply':
        project = await replyToQuestion(customer, reference, input.message);
        await effects.customerDid(req, customer, project, 'replied', input.message);
        break;
      case 'request-revision':
        project = await requestRevision(customer, reference, input.message);
        await effects.customerDid(req, customer, project, 'requested-revision', input.message);
        break;
      case 'sign-off':
        project = await signOff(customer, reference);
        await effects.customerDid(req, customer, project, 'signed-off');
        break;
    }

    req.log.info(
      { userId: customer.id, reference: project.reference, action: input.action },
      'Project action',
    );
    const body: ProjectResponse = { project: toProjectDetail(project) };
    res.json(body);
  });

  return router;
}
