import { Router, type Response } from 'express';
import { requireDatabase } from '../../middleware/require-database';
import { listCategories, listPackages } from './catalogue.service';

/**
 * The public catalogue may be kept for a minute, so a busy page doesn't ask the database every
 * time. Only a successful answer is marked this way: an error keeps the API's default of "never
 * store this". A staging site (D-037) is private, so nothing from it may be kept by a shared cache.
 */
export function catalogueRouter({ publicCaching }: { publicCaching: boolean }): Router {
  const router = Router();
  const keepForAMinute = (res: Response) => {
    if (publicCaching) res.set('Cache-Control', 'public, max-age=60');
  };

  router.get('/categories', requireDatabase, async (_req, res) => {
    const items = await listCategories();
    keepForAMinute(res);
    res.json({ items });
  });

  router.get('/packages', requireDatabase, async (_req, res) => {
    const items = await listPackages();
    keepForAMinute(res);
    res.json({ items });
  });

  return router;
}
