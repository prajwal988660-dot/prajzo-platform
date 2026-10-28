import {
  designCreateSchema,
  designUpdateSchema,
  savedDesignListSchema,
  savedDesignResponseSchema,
} from '@prajzo/shared';
import { Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../../lib/errors';
import { noStore } from '../../middleware/no-store';
import { requireDatabase } from '../../middleware/require-database';
import { createGuards, currentUser } from '../auth/guards';
import type { Sessions } from '../auth/session';
import {
  createDesign,
  deleteDesign,
  duplicateDesign,
  getDesign,
  listDesigns,
  updateDesign,
} from './designs.service';

type DesignsRouterOptions = {
  sessions: Sessions;
  /** Saves (create, change, duplicate, delete) one customer may make per hour. */
  saveRateLimitMax: number;
};

const idOf = (req: Request): string => (typeof req.params.id === 'string' ? req.params.id : '');

/**
 * A customer's saved designs (Phase 9). Customers only; each sees only their own, and a design
 * that isn't theirs is "not found". Every configuration is checked against its template.
 */
export function designsRouter({ sessions, saveRateLimitMax }: DesignsRouterOptions): Router {
  const router = Router();
  const { requireCustomer } = createGuards(sessions);
  router.use(noStore, requireDatabase, sessions.middleware, requireCustomer);

  // Counted per customer (the guard runs first).
  const limitSaves = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: saveRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (_req, res) => currentUser(res.locals as Record<string, unknown>).id,
    handler: (_req, _res, next) => {
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          "You've saved a lot in the last hour. Please wait a little before saving again.",
        ),
      );
    },
  });

  router.get('/', async (_req, res) => {
    res.json(savedDesignListSchema.parse({ items: await listDesigns(currentUser(res.locals)) }));
  });

  router.post('/', limitSaves, async (req, res) => {
    const input = designCreateSchema.parse(req.body);
    const design = await createDesign(currentUser(res.locals), input);
    res.status(201).json(savedDesignResponseSchema.parse({ design }));
  });

  router.get('/:id', async (req, res) => {
    const design = await getDesign(currentUser(res.locals), idOf(req));
    res.json(savedDesignResponseSchema.parse({ design }));
  });

  router.patch('/:id', limitSaves, async (req, res) => {
    const change = designUpdateSchema.parse(req.body);
    const design = await updateDesign(currentUser(res.locals), idOf(req), change);
    res.json(savedDesignResponseSchema.parse({ design }));
  });

  router.post('/:id/duplicate', limitSaves, async (req, res) => {
    const design = await duplicateDesign(currentUser(res.locals), idOf(req));
    res.status(201).json(savedDesignResponseSchema.parse({ design }));
  });

  router.delete('/:id', limitSaves, async (req, res) => {
    await deleteDesign(currentUser(res.locals), idOf(req));
    res.status(204).end();
  });

  return router;
}
