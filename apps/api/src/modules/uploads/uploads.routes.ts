import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { uploadResponseSchema, MAX_UPLOADS_PER_CUSTOMER } from '@prajzo/shared';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../../lib/errors';
import { noStore } from '../../middleware/no-store';
import { requireDatabase } from '../../middleware/require-database';
import { createGuards, currentUser } from '../auth/guards';
import type { Sessions } from '../auth/session';
import { cleanImage, MAX_UPLOAD_BYTES } from './images';
import { UploadModel } from './upload.model';

type UploadsRouterOptions = {
  sessions: Sessions;
  /** Where pictures are kept (D-012: local disk for now). */
  directory: string;
  /** Pictures one customer may upload per hour. */
  rateLimitMax: number;
};

/**
 * Picture uploads for the builder (D-012): signed-in customers only. The picture is the request
 * body itself (no form encoding), checked by its content, cleaned, and stored as WebP under a
 * random name. The answer is its address, such as /uploads/1f0e…c3.webp.
 */
export function uploadsRouter({ sessions, directory, rateLimitMax }: UploadsRouterOptions): Router {
  const router = Router();
  const { requireCustomer } = createGuards(sessions);

  const limitUploads = rateLimit({
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
          "You've uploaded a lot in the last hour. Please wait a little.",
        ),
      );
    },
  });

  router.post(
    '/uploads',
    noStore,
    requireDatabase,
    sessions.middleware,
    requireCustomer,
    limitUploads,
    // Read the body only after the checks above, and only up to 5 MB (one byte more is refused).
    express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
    async (req, res) => {
      const owner = currentUser(res.locals);
      if ((await UploadModel.countDocuments({ owner: owner._id })) >= MAX_UPLOADS_PER_CUSTOMER) {
        throw new AppError(
          409,
          'CONFLICT',
          `You can keep up to ${String(MAX_UPLOADS_PER_CUSTOMER)} pictures. Contact us if you need more.`,
        );
      }
      const body: unknown = req.body;
      const image = await cleanImage(Buffer.isBuffer(body) ? body : Buffer.alloc(0));
      const file = `${randomUUID()}.webp`;
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, file), image.data, { flag: 'wx' });
      await UploadModel.create({
        owner: owner._id,
        file,
        bytes: image.data.length,
        width: image.width,
        height: image.height,
      });
      res.status(201).json(
        uploadResponseSchema.parse({
          src: `/uploads/${file}`,
          width: image.width,
          height: image.height,
        }),
      );
    },
  );

  return router;
}

/** Serves uploaded pictures. Their names are random and never reused, so they are kept a year. */
export function serveUploads(directory: string) {
  return express.static(directory, {
    index: false,
    redirect: false,
    fallthrough: false,
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => res.setHeader('Content-Type', 'image/webp'),
  });
}
