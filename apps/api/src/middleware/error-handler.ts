import type { ApiErrorBody } from '@prajzo/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

/** Unknown /api routes get a JSON 404 (never the web app's HTML page). */
export const apiNotFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'This API route does not exist.'));
};

/** Turns any error into the shared error format without leaking internal details. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { status, body } = toErrorResponse(error);
  if (status >= 500) req.log.error({ err: error }, 'Request failed');
  res.status(status).json(body);
};

export function toErrorResponse(error: unknown): { status: number; body: ApiErrorBody } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      },
    };
  }

  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'form';
      fields[key] ??= issue.message;
    }
    return {
      status: 400,
      body: { error: { code: 'VALIDATION_FAILED', message: 'Some details need fixing.', fields } },
    };
  }

  // Errors raised by express.json() for bad request bodies
  const bodyErrorType = (error as { type?: unknown } | null)?.type;
  if (bodyErrorType === 'entity.parse.failed') {
    return {
      status: 400,
      body: { error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' } },
    };
  }
  if (bodyErrorType === 'entity.too.large') {
    return {
      status: 413,
      body: { error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large.' } },
    };
  }

  // Other client errors raised by Express internals (e.g. a missing static file)
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return status === 404
      ? { status, body: { error: { code: 'NOT_FOUND', message: 'Not found.' } } }
      : {
          status,
          body: { error: { code: 'BAD_REQUEST', message: 'The request could not be processed.' } },
        };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again.',
      },
    },
  };
}
