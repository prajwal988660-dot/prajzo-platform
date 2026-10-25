import { z } from 'zod';
import { projectStatusSchema } from '../projects/status';
import { auditEntrySchema } from './audit';

const count = z.number().int().nonnegative();

/** GET /admin/overview: real counts from the database. */
export const adminOverviewSchema = z.object({
  customers: count,
  contactMessages: z.object({ total: count, unread: count }),
  projectRequests: z.object({
    total: count,
    /** Requests nobody has started reviewing yet (status "Request Received"). */
    received: count,
    /** How many projects are in each status, every status included even when it is zero. */
    byStatus: z.record(projectStatusSchema, count),
    /** What is waiting for Prajzo to act. */
    toDo: z.object({
      newRequests: count,
      /** Customers who answered a question and are waiting for the project to move on. */
      replies: count,
      /** Accepted quotes waiting for a delivery date and a start. */
      accepted: count,
      /** Revisions the customer asked for. */
      revisions: count,
      /** Customers who said a finished project looks good: waiting for Prajzo to complete it. */
      signedOff: count,
    }),
  }),
  /** The latest things admins and customers did. */
  recentActivity: z.array(auditEntrySchema),
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
