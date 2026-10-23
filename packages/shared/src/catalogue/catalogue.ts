import { z } from 'zod';

/** How quickly a kind of project can usually be delivered once its scope is agreed. */
export const deliveryTiers = ['quick', 'professional', 'advanced', 'custom'] as const;
export type DeliveryTier = (typeof deliveryTiers)[number];

export const deliveryTierLabels: Record<DeliveryTier, { name: string; target: string }> = {
  quick: { name: 'Quick Launch', target: 'Target: within 24 hours' },
  professional: { name: 'Professional Website', target: 'Target: within 3 days' },
  advanced: { name: 'Advanced Development', target: 'Target: within 7 days' },
  custom: { name: 'Custom project', target: 'Timeline agreed after review' },
};

/** The conditions that always apply to the delivery targets (shown wherever targets appear). */
export const deliveryConditions =
  'Delivery targets are not guarantees. They depend on the agreed scope, how ready your content is, ' +
  'any third-party integrations, testing and your approvals. We confirm a delivery date only after ' +
  'reviewing your project.';

/** A website category from the service catalogue (GET /api/v1/categories). */
export const categorySchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  useCases: z.array(z.string()),
  deliveryTier: z.enum(deliveryTiers),
});
export type Category = z.infer<typeof categorySchema>;

export const categoryListSchema = z.object({ items: z.array(categorySchema) });

export const priceModes = ['quote', 'from', 'fixed'] as const;
export type PriceMode = (typeof priceModes)[number];

/** A service package (GET /api/v1/packages). Amounts are whole paise (₹1 = 100 paise). */
export const servicePackageSchema = z.object({
  key: z.string(),
  name: z.string(),
  summary: z.string(),
  deliveryTier: z.enum(deliveryTiers),
  scope: z.array(z.string()),
  priceMode: z.enum(priceModes),
  priceAmountPaise: z.number().int().nonnegative().nullable(),
  currency: z.literal('INR'),
});
export type ServicePackage = z.infer<typeof servicePackageSchema>;

export const servicePackageListSchema = z.object({ items: z.array(servicePackageSchema) });
