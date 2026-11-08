import { demoSubmissionRequestSchema, type DemoSubmissionResponse } from '@prajzo/shared';
import { templateFor } from '@prajzo/shared/templates';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../../lib/errors';
import { requireDatabase } from '../../middleware/require-database';
import { DemoSubmissionModel } from './demo-submission.model';

/** The events a demo's registration form offers: only those can be chosen. */
function registrationEventsOf(key: string): string[] {
  const template = templateFor(key);
  return (template?.parsedDefault.pages ?? []).flatMap((page) =>
    page.sections.flatMap((section) =>
      section.type === 'registration' ? section.content.events : [],
    ),
  );
}

/** The products a demo's catalogue has: only those can be asked about. */
function productNamesOf(key: string): string[] {
  const template = templateFor(key);
  return (template?.parsedDefault.pages ?? []).flatMap((page) =>
    page.sections.flatMap((section) =>
      section.type === 'products' ? section.content.items.map((product) => product.name) : [],
    ),
  );
}

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
    if (
      input.form === 'registration' &&
      !registrationEventsOf(input.template).includes(input.choice)
    ) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Some details need fixing.', {
        choice: 'Choose one of the events on the form',
      });
    }
    if (input.form === 'enquiry' && !productNamesOf(input.template).includes(input.choice)) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Some details need fixing.', {
        choice: 'Choose one of the products',
      });
    }
    const expiresAt = new Date(Date.now() + keepDays * 24 * 60 * 60 * 1000);
    const who = { template: input.template, name: input.name, email: input.email, expiresAt };
    await DemoSubmissionModel.create(
      input.form === 'contact'
        ? { ...who, form: 'contact', message: input.message }
        : input.form === 'registration'
          ? {
              ...who,
              form: 'registration',
              phone: input.phone,
              organisation: input.organisation,
              choice: input.choice,
            }
          : {
              ...who,
              form: 'enquiry',
              phone: input.phone,
              choice: input.choice,
              quantity: input.quantity,
              message: input.message,
            },
    );
    const body: DemoSubmissionResponse = { received: true, deleteAfter: expiresAt.toISOString() };
    res.status(201).json(body);
  });

  return router;
}
