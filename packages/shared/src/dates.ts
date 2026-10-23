const indiaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in India as YYYY-MM-DD, whatever time zone this computer is set to. */
export function todayInIndia(now: Date = new Date()): string {
  return indiaDate.format(now);
}

/** The current year in India, used in project reference numbers such as PRZ-2026-0001. */
export function yearInIndia(now: Date = new Date()): number {
  return Number(todayInIndia(now).slice(0, 4));
}

/** True for a real calendar date written as YYYY-MM-DD (so not 2026-02-31). */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
