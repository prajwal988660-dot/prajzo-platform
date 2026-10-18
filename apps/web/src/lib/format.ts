import type { ServicePackage } from '@prajzo/shared';

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** 299900 paise → "₹2,999" (Indian digit grouping: ₹1,20,000). */
export function formatRupees(paise: number): string {
  return rupees.format(paise / 100);
}

/** How a package's price is shown: "From ₹2,999", "₹2,999" or "Request a quote". */
export function describePrice(
  servicePackage: Pick<ServicePackage, 'priceMode' | 'priceAmountPaise'>,
): { label: string; amount: string | null } {
  const { priceMode, priceAmountPaise } = servicePackage;
  if (priceMode === 'quote' || priceAmountPaise === null)
    return { label: 'Request a quote', amount: null };
  return {
    label: priceMode === 'from' ? 'Starting from' : 'Price',
    amount: formatRupees(priceAmountPaise),
  };
}
