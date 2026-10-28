import { z } from 'zod';
import { templateKeys, websiteConfigSchema } from './site-config/config';

/**
 * Saved designs (Phase 9): a customer's own copies of a template, made in the builder. Each is a
 * complete website configuration (D-004). The server checks it against its template on every
 * save (architecture 5.3) and never trusts the browser's copy. Only its owner can see it.
 */

/** How many designs one customer may keep. */
export const MAX_SAVED_DESIGNS = 30;

export const designNameSchema = z
  .string()
  .trim()
  .min(1, 'Give the design a name')
  .max(60, 'Keep the name under 60 characters');

export const savedDesignSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  templateKey: z.enum(templateKeys),
  templateName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SavedDesignSummary = z.infer<typeof savedDesignSummarySchema>;

export const savedDesignSchema = savedDesignSummarySchema.extend({ config: websiteConfigSchema });
export type SavedDesign = z.infer<typeof savedDesignSchema>;

/** GET /designs: newest change first. */
export const savedDesignListSchema = z.object({ items: z.array(savedDesignSummarySchema) });
/** GET /designs/:id, and the answer to every change. */
export const savedDesignResponseSchema = z.object({ design: savedDesignSchema });

/** POST /designs. The configuration is checked on the server against its own template. */
export const designCreateSchema = z.object({ name: designNameSchema, config: z.unknown() });

/** PATCH /designs/:id: rename, save new content, or both. */
export const designUpdateSchema = z
  .object({ name: designNameSchema.optional(), config: z.unknown().optional() })
  .refine((change) => change.name !== undefined || change.config !== undefined, {
    message: 'Nothing to change',
  });
