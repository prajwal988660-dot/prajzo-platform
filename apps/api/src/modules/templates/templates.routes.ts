import { templateListResponseSchema, templateResponseSchema } from '@prajzo/shared';
import { Router } from 'express';
import { requireDatabase } from '../../middleware/require-database';
import { getPublishedTemplate, listPublishedTemplates } from './templates.service';

/** The public template catalogue: what the Templates pages show. */
export function templatesRouter(): Router {
  const router = Router();

  router.get('/templates', requireDatabase, async (_req, res) => {
    res.json(templateListResponseSchema.parse({ items: await listPublishedTemplates() }));
  });

  router.get('/templates/:key', requireDatabase, async (req, res) => {
    const template = await getPublishedTemplate(String(req.params.key));
    res.json(templateResponseSchema.parse({ template }));
  });

  return router;
}
