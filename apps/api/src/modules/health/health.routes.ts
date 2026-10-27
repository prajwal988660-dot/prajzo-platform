import type { HealthResponse, ReadinessResponse } from '@prajzo/shared';
import { Router } from 'express';
import { noStore } from '../../middleware/no-store';

export function healthRouter({ checkDatabase }: { checkDatabase: () => Promise<boolean> }): Router {
  const router = Router();

  // Only for its own routes: this router is mounted on all of /api, so a rule written without a
  // path would also apply to every other API answer.
  router.use('/health', noStore);

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
