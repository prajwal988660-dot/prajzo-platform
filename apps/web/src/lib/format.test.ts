import { describe, expect, it } from 'vitest';
import { describePrice, formatRupees } from './format';

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
