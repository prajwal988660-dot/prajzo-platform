import { describe, expect, it } from 'vitest';
import {
  describePrice,
  formatCalendarDate,
  formatDate,
  formatDateTime,
  formatRupees,
} from './format';

describe('formatRupees', () => {
  it('formats paise as whole rupees with Indian digit grouping', () => {
    expect(formatRupees(299_900)).toBe('₹2,999');
    expect(formatRupees(12_000_000)).toBe('₹1,20,000');
  });
});

describe('describePrice', () => {
  it('shows starting prices', () => {
    expect(describePrice({ priceMode: 'from', priceAmountPaise: 799_900 })).toEqual({
      label: 'Starting from',
      amount: '₹7,999',
    });
  });

  it('shows "Request a quote" until a price is set', () => {
    expect(describePrice({ priceMode: 'quote', priceAmountPaise: null })).toEqual({
      label: 'Request a quote',
      amount: null,
    });
    expect(describePrice({ priceMode: 'from', priceAmountPaise: null }).amount).toBeNull();
  });
});

describe('dates in India time', () => {
  it('shows a moment as India time, however the computer is set', () => {
    // 13:30 UTC is 19:00 in India.
    expect(formatDateTime('2026-10-23T13:30:00.000Z')).toBe('23 Oct 2026, 7:00 pm');
    // 20:00 UTC on the 23rd is already the 24th in India.
    expect(formatDate('2026-10-23T20:00:00.000Z')).toBe('24 Oct 2026');
  });

  it('shows a calendar date exactly as chosen, never shifted a day', () => {
    expect(formatCalendarDate('2026-12-01')).toBe('1 Dec 2026');
    expect(formatCalendarDate('2027-01-01')).toBe('1 Jan 2027');
  });
});
