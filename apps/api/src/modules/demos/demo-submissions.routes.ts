import { demoSubmissionRequestSchema, type DemoSubmissionResponse } from '@prajzo/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../../lib/errors';
import { requireDatabase } from '../../middleware/require-database';
import { DemoSubmissionModel } from './demo-submission.model';

type DemoSubmissionsRouterOptions = {
  /** Demo messages allowed per connection every 15 minutes. */
  rateLimitMax: number;
  /** Days a demo message is kept before it is deleted by itself. */
  keepDays: number;
};

/**
 * The live demos' contact forms (D-014): validated, rate-limited, stored for the admin inbox,
 * and deleted automatically. No email is sent to anyone.
 */
export function demoSubmissionsRouter({
  rateLimitMax,
  keepDays,
}: DemoSubmissionsRouterOptions): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          'Too many messages from your connection. Please wait a few minutes and try again.',
        ),
      );
    },
  });

  // requireDatabase comes first, so attempts during an outage don't use up the visitor's quota.
  router.post('/demo-submissions', requireDatabase, limiter, async (req, res) => {
    const input = demoSubmissionRequestSchema.parse(req.body);
    const expiresAt = new Date(Date.now() + keepDays * 24 * 60 * 60 * 1000);
    await DemoSubmissionModel.create({
      template: input.template,
      name: input.name,
      email: input.email,
      message: input.message,
      expiresAt,
    });
    const body: DemoSubmissionResponse = { received: true, deleteAfter: expiresAt.toISOString() };
    res.status(201).json(body);
  });

  return router;
}
