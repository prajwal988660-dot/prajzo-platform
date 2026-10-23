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

const dateTime = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

const dateOnly = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

/** A moment from the API ("2026-10-23T13:30:00.000Z") as India time: "23 Oct 2026, 7:00 pm". */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** A moment from the API as a date in India: "23 Oct 2026". */
export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso));
}

/** A calendar date with no time ("2026-12-01") as "1 Dec 2026", never shifted by a time zone. */
export function formatCalendarDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}
