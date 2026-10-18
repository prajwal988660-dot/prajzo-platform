import {
  apiErrorBodySchema,
  readinessResponseSchema,
  type ReadinessResponse,
} from '@prajzo/shared';
import type { z } from 'zod';

const NETWORK_MESSAGE =
  'We could not reach the Prajzo server. Check your connection and try again.';
const UNEXPECTED_MESSAGE = 'The server sent an unexpected response. Please try again.';

/** A failed API call, with a message that is safe to show to the user. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { credentials: 'same-origin', ...init });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Calls the API and checks the response against `schema`.
 * Throws ApiError for network problems, error responses and unexpected data.
 */
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await send(`/api${path}`, { ...init, headers });
  const data = await readJson(response);

  if (!response.ok) {
    const parsed = apiErrorBodySchema.safeParse(data);
    if (parsed.success) {
      const { code, message, fields } = parsed.data.error;
      throw new ApiError(response.status, code, message, fields);
    }
    throw new ApiError(response.status, 'UNEXPECTED_RESPONSE', UNEXPECTED_MESSAGE);
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new ApiError(response.status, 'UNEXPECTED_RESPONSE', UNEXPECTED_MESSAGE);
  return parsed.data;
}

/** Readiness check. A 503 answer is normal here (database down), so the body is read either way. */
export async function getReadiness(signal?: AbortSignal): Promise<ReadinessResponse> {
  const response = await send('/api/health/ready', {
    headers: { Accept: 'application/json' },
    signal,
  });
  const parsed = readinessResponseSchema.safeParse(await readJson(response));
  if (!parsed.success)
    throw new ApiError(response.status, 'UNEXPECTED_RESPONSE', UNEXPECTED_MESSAGE);
  return parsed.data;
}
