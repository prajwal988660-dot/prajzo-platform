import { z } from 'zod';
import { paginatedSchema, paginationQuerySchema } from '../api/pagination';

export const auditTargetTypes = [
  'project',
  'category',
  'package',
  'contact-message',
  'template',
  'demo-submission',
] as const;
export type AuditTargetType = (typeof auditTargetTypes)[number];

/** GET /admin/activity?targetType=&page=&limit= */
export const auditListQuerySchema = paginationQuerySchema.extend({
  targetType: z.enum(['all', ...auditTargetTypes]).default('all'),
});

/** One thing someone did: an admin's action, or something a customer did to their project. */
export const auditEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  actorName: z.string(),
  actorRole: z.enum(['admin', 'customer']),
  /** A short code such as "project.status", for filtering and tests. */
  action: z.string(),
  /** The same thing in plain words, written when it happened. */
  summary: z.string(),
  targetType: z.enum(auditTargetTypes),
  /** The project reference, the category or package key, or the message id. */
  targetId: z.string(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditListSchema = paginatedSchema(auditEntrySchema);
export type AuditList = z.infer<typeof auditListSchema>;
