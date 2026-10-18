import { Router } from 'express';
import { listCategories, listPackages } from './catalogue.service';

export function catalogueRouter(): Router {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ items: await listCategories() });
  });

  router.get('/packages', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ items: await listPackages() });
  });

  return router;
}
