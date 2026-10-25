import { z } from 'zod';
import { paginatedSchema, paginationQuerySchema } from '../api/pagination';
import { optionalText } from '../text';

export const contactMessageStatuses = ['new', 'read', 'archived'] as const;
export type ContactMessageStatus = (typeof contactMessageStatuses)[number];

/** Which messages the inbox shows. "inbox" is everything that is not archived. */
export const adminMessageFilters = ['inbox', 'new', 'read', 'archived', 'all'] as const;
export type AdminMessageFilter = (typeof adminMessageFilters)[number];

/** GET /admin/contact-messages?status=&q=&page=&limit= */
export const adminMessageListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(adminMessageFilters).default('inbox'),
  /** Matches the sender's name, email or message. */
  q: optionalText(100),
});

export const adminContactMessageSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  websiteType: z.string().nullable(),
  websiteTypeTitle: z.string().nullable(),
  packageKey: z.string().nullable(),
  packageName: z.string().nullable(),
  message: z.string(),
  status: z.enum(contactMessageStatuses),
  createdAt: z.string(),
});
export type AdminContactMessage = z.infer<typeof adminContactMessageSchema>;

export const adminMessageListSchema = paginatedSchema(adminContactMessageSchema);
export type AdminMessageList = z.infer<typeof adminMessageListSchema>;

/** PATCH /admin/contact-messages/:id */
export const adminMessageUpdateSchema = z.object({ status: z.enum(contactMessageStatuses) });
export type AdminMessageUpdate = z.infer<typeof adminMessageUpdateSchema>;

export const adminMessageResponseSchema = z.object({ message: adminContactMessageSchema });
export type AdminMessageResponse = z.infer<typeof adminMessageResponseSchema>;
