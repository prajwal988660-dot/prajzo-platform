import { contactRequestSchema, type ContactResponse } from '@prajzo/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../../lib/errors';
import { requireDatabase } from '../../middleware/require-database';
import { describeError } from '../../db/connection';
import type { Mailer } from '../../services/mailer';
import { isActiveCategory, isActivePackage } from '../catalogue/catalogue.service';
import { ContactMessageModel } from './contact-message.model';

type ContactRouterOptions = {
  mailer: Mailer;
  /** Where new-message notifications go. */
  notifyEmail: string;
  /** Messages allowed per connection every 15 minutes. */
  rateLimitMax: number;
};

export function contactRouter({ mailer, notifyEmail, rateLimitMax }: ContactRouterOptions): Router {
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
  router.post('/contact', requireDatabase, limiter, async (req, res) => {
    const input = contactRequestSchema.parse(req.body);

    const fields: Record<string, string> = {};
    if (
      input.websiteType &&
      input.websiteType !== 'other' &&
      !(await isActiveCategory(input.websiteType))
    ) {
      fields.websiteType = 'Choose a website type from the list';
    }
    if (
      input.packageKey &&
      input.packageKey !== 'not-sure' &&
      !(await isActivePackage(input.packageKey))
    ) {
      fields.packageKey = 'Choose a package from the list';
    }
    if (Object.keys(fields).length > 0) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Some details need fixing.', fields);
    }

    const saved = await ContactMessageModel.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      websiteType: input.websiteType,
      packageKey: input.packageKey,
      message: input.message,
      consentAt: new Date(),
    });

    // The message is safely stored, so a failed notification must not fail the request.
    await mailer
      .send({
        to: notifyEmail,
        replyTo: input.email,
        subject: `New enquiry from ${input.name}`,
        text: [
          `Name: ${input.name}`,
          `Email: ${input.email}`,
          `Phone: ${input.phone ?? '(not given)'}`,
          `Website type: ${input.websiteType ?? '(not given)'}`,
          `Package: ${input.packageKey ?? '(not given)'}`,
          '',
          input.message,
          '',
          `Message ID: ${saved.id}`,
        ].join('\n'),
      })
      .catch((error: unknown) => {
        req.log.error({ reason: describeError(error) }, 'Contact notification email failed');
      });

    const body: ContactResponse = {
      received: true,
      message: `Thanks, ${input.name}. We've received your message and will reply to ${input.email}.`,
    };
    res.status(201).json(body);
  });

  return router;
}
