import { z } from 'zod';
import {
  categorySchema,
  deliveryTiers,
  priceModes,
  servicePackageSchema,
} from '../catalogue/catalogue';
import { maxQuotePaise } from '../projects/admin-projects';
import { keySchema, requiredText } from '../text';

/** The icons a category can use: the website knows how to draw each of these. */
export const categoryIcons = [
  'AppWindow',
  'Building2',
  'CalendarCheck',
  'CalendarDays',
  'ClipboardList',
  'GraduationCap',
  'IdCard',
  'LayoutDashboard',
  'Megaphone',
  'Plane',
  'Printer',
  'ShoppingBag',
  'UserRound',
  'UtensilsCrossed',
  'Wrench',
] as const;
export type CategoryIcon = (typeof categoryIcons)[number];

const sortOrder = z
  .number('Enter a number')
  .int('Enter a whole number')
  .min(0, 'Enter 0 or more')
  .max(9999, 'Enter 9999 or less');

// ---------- Categories (the kinds of website Prajzo builds)

/** A category as an admin sees it: also the ones that are switched off. */
export const adminCategorySchema = categorySchema.extend({
  sortOrder: z.number().int(),
  active: z.boolean(),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;

export const adminCategoryListSchema = z.object({ items: z.array(adminCategorySchema) });
export type AdminCategoryList = z.infer<typeof adminCategoryListSchema>;

export const adminCategoryResponseSchema = z.object({ category: adminCategorySchema });
export type AdminCategoryResponse = z.infer<typeof adminCategoryResponseSchema>;

/** PATCH /admin/categories/:key. The key never changes once a category exists. */
export const categoryInputSchema = z.object({
  title: requiredText(2, 100, 'Enter a title (at least 2 characters)'),
  description: requiredText(10, 500, 'Describe it in a sentence (at least 10 characters)'),
  icon: z.enum(categoryIcons, 'Choose an icon from the list'),
  useCases: z
    .array(requiredText(2, 100, 'Each example needs at least 2 characters'))
    .max(8, 'Keep it to 8 examples'),
  deliveryTier: z.enum(deliveryTiers, 'Choose how quickly this kind of project is usually done'),
  sortOrder,
  active: z.boolean(),
});
export type CategoryInput = z.output<typeof categoryInputSchema>;

/** POST /admin/categories */
export const categoryCreateSchema = categoryInputSchema.extend({ key: keySchema });
export type CategoryCreate = z.output<typeof categoryCreateSchema>;

// ---------- Packages and their prices

export const adminPackageSchema = servicePackageSchema.extend({
  sortOrder: z.number().int(),
  active: z.boolean(),
});
export type AdminPackage = z.infer<typeof adminPackageSchema>;

export const adminPackageListSchema = z.object({ items: z.array(adminPackageSchema) });
export type AdminPackageList = z.infer<typeof adminPackageListSchema>;

export const adminPackageResponseSchema = z.object({ package: adminPackageSchema });
export type AdminPackageResponse = z.infer<typeof adminPackageResponseSchema>;

const packageFields = z.object({
  name: requiredText(2, 100, 'Enter a name (at least 2 characters)'),
  summary: requiredText(10, 300, 'Describe it in a sentence (at least 10 characters)'),
  deliveryTier: z.enum(deliveryTiers, 'Choose how quickly this package is usually delivered'),
  scope: z
    .array(requiredText(2, 120, 'Each item needs at least 2 characters'))
    .max(12, 'Keep it to 12 items'),
  priceMode: z.enum(priceModes, 'Choose how the price is shown'),
  /** Whole paise (1 rupee = 100 paise). Empty for "Request a quote". */
  priceAmountPaise: z
    .number('Enter the price in rupees')
    .int('Enter a whole number of rupees')
    .min(100, 'Enter the price, at least ₹1')
    .max(maxQuotePaise, 'That is more than ₹1 crore. Please check the price')
    .multipleOf(100, 'Enter a whole number of rupees')
    .nullish()
    .transform((value) => value ?? null),
  sortOrder,
  active: z.boolean(),
});

type PackageFields = z.output<typeof packageFields>;

/** A "Request a quote" package has no price; the other kinds must have one. */
function checkPrice(value: PackageFields, context: z.core.$RefinementCtx) {
  if (value.priceMode === 'quote' && value.priceAmountPaise !== null) {
    context.addIssue({
      code: 'custom',
      path: ['priceAmountPaise'],
      message: 'Leave the price empty when it is shown as "Request a quote"',
    });
  }
  if (value.priceMode !== 'quote' && value.priceAmountPaise === null) {
    context.addIssue({
      code: 'custom',
      path: ['priceAmountPaise'],
      message: 'Enter the price',
    });
  }
}

/** PATCH /admin/packages/:key. The key never changes once a package exists. */
export const packageInputSchema = packageFields.superRefine(checkPrice);
export type PackageInput = z.output<typeof packageInputSchema>;

/** POST /admin/packages */
export const packageCreateSchema = packageFields
  .extend({ key: keySchema })
  .superRefine((value, context) => checkPrice(value, context));
export type PackageCreate = z.output<typeof packageCreateSchema>;
