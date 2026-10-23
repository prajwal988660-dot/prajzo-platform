import { z } from 'zod';

/** `?page=1&limit=20` on list endpoints: at most 50 items a page. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'The page number starts at 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'The page size starts at 1')
    .max(50, 'The page size is at most 50')
    .default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** The shape of every list response: `{ items, page, limit, total }`. */
export function paginatedSchema<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().nonnegative(),
  });
}
