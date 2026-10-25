import { categoryInputSchema } from '@prajzo/shared';
import { describe, expect, it } from 'vitest';
import { linesOf, rupeesFromPaise, rupeesText, toLines, wholeNumber } from './form-fields';

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe('rupeesText', () => {
  it.each([
    ['15000', 1_500_000],
    ['  15000  ', 1_500_000],
    ['1', 100],
    ['2999.00', 299_900],
    ['0000500', 50_000],
    ['10000000', 1_000_000_000],
  ])('turns %j rupees into %i paise', (typed, paise) => {
    expect(rupeesText.parse(typed)).toBe(paise);
  });

  it.each([
    ['', 'Enter the price in rupees, for example 15000'],
    ['abc', 'Enter the price in rupees, for example 15000'],
    ['₹15000', 'Enter the price in rupees, for example 15000'],
    ['15,000', 'Enter the price in rupees, for example 15000'],
    ['-5', 'Enter the price in rupees, for example 15000'],
    ['1e3', 'Enter the price in rupees, for example 15000'],
    ['12.345', 'Enter the price in rupees, for example 15000'],
    ['0', 'Enter the price, at least ₹1'],
    ['0.50', 'Enter the price, at least ₹1'],
    ['1.50', 'Enter a whole number of rupees'],
    ['10000001', 'That is more than ₹1 crore. Please check the price'],
  ])('refuses %j with a message that says what to fix', (typed, message) => {
    const result = rupeesText.safeParse(typed);
    expect(result.success).toBe(false);
    // A form shows the first message for a field, so that is the one that has to be right.
    expect(messages(result)[0]).toBe(message);
  });
});

describe('rupeesFromPaise', () => {
  it('shows paise as the rupees a person would type', () => {
    expect(rupeesFromPaise(1_500_000)).toBe('15000');
    expect(rupeesFromPaise(299_900)).toBe('2999');
  });

  it('is undone by rupeesText', () => {
    expect(rupeesText.parse(rupeesFromPaise(799_900))).toBe(799_900);
  });
});

describe('linesOf', () => {
  const lines = linesOf(categoryInputSchema.shape.useCases);

  it('makes one item of each line, trimmed, ignoring empty lines', () => {
    expect(lines.parse('Shops\n\n  Boutiques  \n   \nSalons')).toEqual([
      'Shops',
      'Boutiques',
      'Salons',
    ]);
  });

  it('accepts no lines at all', () => {
    expect(lines.parse('')).toEqual([]);
    expect(lines.parse('  \n \n')).toEqual([]);
  });

  it('applies the rules for the items', () => {
    expect(messages(lines.safeParse('x'))).toEqual(['Each example needs at least 2 characters']);
    expect(
      messages(lines.safeParse(Array.from({ length: 9 }, (_, i) => `Item ${i}`).join('\n'))),
    ).toEqual(['Keep it to 8 examples']);
  });

  it('is undone by toLines', () => {
    expect(lines.parse(toLines(['Shops', 'Boutiques']))).toEqual(['Shops', 'Boutiques']);
    expect(toLines([])).toBe('');
  });
});

describe('wholeNumber', () => {
  const order = wholeNumber(categoryInputSchema.shape.sortOrder);

  it('reads digits as a number', () => {
    expect(order.parse('0')).toBe(0);
    expect(order.parse(' 40 ')).toBe(40);
    expect(order.parse('007')).toBe(7);
  });

  it.each(['', 'ten', '-1', '1.5', '1e2', '0x10'])('refuses %j', (typed) => {
    expect(messages(order.safeParse(typed))).toEqual(['Enter a whole number, 0 or more']);
  });

  it('applies the limits of the field', () => {
    expect(messages(order.safeParse('10000'))).toEqual(['Enter 9999 or less']);
  });
});
