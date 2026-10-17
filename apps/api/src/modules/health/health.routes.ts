import type { HealthResponse, ReadinessResponse } from '@prajzo/shared';
import { Router } from 'express';

export function healthRouter({ checkDatabase }: { checkDatabase: () => Promise<boolean> }): Router {
  const router = Router();

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Liveness: the process is up.
  router.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
    res.json(body);
  });

  // Readiness: the API can do real work, i.e. its database answers.
  router.get('/health/ready', async (_req, res) => {
    const connected = await checkDatabase();
    const body: ReadinessResponse = connected
      ? { status: 'ready', database: 'connected' }
      : { status: 'unavailable', database: 'disconnected' };
    res.status(connected ? 200 : 503).json(body);
  });

  return router;
}
