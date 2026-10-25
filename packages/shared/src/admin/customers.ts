import { z } from 'zod';
import { paginatedSchema, paginationQuerySchema } from '../api/pagination';
import { projectSummarySchema } from '../projects/project-request';
import { optionalText } from '../text';

/** GET /admin/customers?q=&page=&limit= */
export const adminCustomerListQuerySchema = paginationQuerySchema.extend({
  /** Matches the customer's name or email. */
  q: optionalText(100),
});

export const adminCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.enum(['active', 'disabled']),
  projectCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
});
export type AdminCustomer = z.infer<typeof adminCustomerSchema>;

export const adminCustomerListSchema = paginatedSchema(adminCustomerSchema);
export type AdminCustomerList = z.infer<typeof adminCustomerListSchema>;

/** One customer with their projects, newest first. */
export const adminCustomerDetailSchema = z.object({
  customer: adminCustomerSchema,
  projects: z.array(projectSummarySchema),
});
export type AdminCustomerDetail = z.infer<typeof adminCustomerDetailSchema>;
