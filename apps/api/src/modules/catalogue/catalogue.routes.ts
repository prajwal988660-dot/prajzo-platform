import { Router } from 'express';
import { requireDatabase } from '../../middleware/require-database';
import { listCategories, listPackages } from './catalogue.service';

export function catalogueRouter(): Router {
  const router = Router();

  router.get('/categories', requireDatabase, async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ items: await listCategories() });
  });

  router.get('/packages', requireDatabase, async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ items: await listPackages() });
  });

  return router;
}
