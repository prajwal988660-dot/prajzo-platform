const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** 299900 paise becomes "₹2,999" (Indian digit grouping: ₹1,20,000). Prices are whole rupees. */
export function formatRupees(paise: number): string {
  return rupees.format(paise / 100);
}
