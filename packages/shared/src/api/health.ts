import { z } from 'zod';

/** GET /api/health: the API process is running. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number().int().nonnegative(),
});

/** GET /api/health/ready: the API can serve requests (its database is reachable). */
export const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'unavailable']),
  database: z.enum(['connected', 'disconnected']),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
