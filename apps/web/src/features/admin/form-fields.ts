import {
  deliveryTierLabels,
  deliveryTiers,
  quoteInputSchema,
  type DeliveryTier,
} from '@prajzo/shared';
import { z } from 'zod';

/**
 * Rupees as an admin types them ("15000" or "15000.50") become whole paise, then get the same
 * checks the server applies to a price: at least ₹1, whole rupees, at most ₹1 crore.
 */
export const rupeesText = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, 'Enter the price in rupees, for example 15000')
  .transform((value) => Math.round(Number(value) * 100))
  .pipe(quoteInputSchema.shape.amountPaise);

/** Whole paise as the rupees to show in a box ("1500000" becomes "15000"). */
export const rupeesFromPaise = (paise: number): string => String(paise / 100);

/** A multi-line box where every line is one item ("one example per line"); empty lines are ignored. */
export const linesOf = <Items extends z.ZodType<string[], string[]>>(items: Items) =>
  z
    .string()
    .transform((text) =>
      text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== ''),
    )
    .pipe(items);

/** A whole number typed into a box, checked by `rule`. */
export const wholeNumber = <Rule extends z.ZodType<number, number>>(rule: Rule) =>
  z.string().trim().regex(/^\d+$/, 'Enter a whole number, 0 or more').transform(Number).pipe(rule);

/** An array of items as the lines of a multi-line box. */
export const toLines = (items: readonly string[]): string => items.join('\n');

/** What a choice of delivery speed means, for the hint under the choice. */
export function deliveryTierHint(value: string): string {
  const known = (deliveryTiers as readonly string[]).includes(value);
  return known
    ? `${deliveryTierLabels[value as DeliveryTier].target}. Targets are not guarantees.`
    : 'Choose how quickly this is usually delivered.';
}
