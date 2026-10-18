import { describe, expect, it } from 'vitest';
import { contactRequestSchema } from './contact';
import { siteLinks } from './site';

const valid = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  message: 'We need a five-page website for our bakery in Mysuru.',
  consent: true,
};

function fieldErrors(input: unknown): Record<string, string> {
  const result = contactRequestSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
}

describe('contactRequestSchema', () => {
  it('accepts a complete request and trims the text', () => {
    const result = contactRequestSchema.parse({ ...valid, name: '  Asha Rao  ', phone: '' });
    expect(result.name).toBe('Asha Rao');
    expect(result.phone).toBeUndefined();
  });

  it('accepts an Indian phone number with spaces and a country code', () => {
    expect(fieldErrors({ ...valid, phone: '+91 98866 07720' })).toEqual({});
  });

  it('explains each problem in plain words', () => {
    expect(fieldErrors({ name: 'A', email: 'nope', message: 'Too short', consent: false })).toEqual(
      {
        name: 'Enter your name',
        email: 'Enter an email address like name@example.com',
        message: 'Tell us a little more (at least 20 characters)',
        consent: 'Tick this box so we can reply to you',
      },
    );
  });

  it('rejects phone numbers with letters', () => {
    expect(fieldErrors({ ...valid, phone: 'call me maybe' })).toHaveProperty('phone');
  });

  it('rejects requests that filled in the hidden spam trap', () => {
    expect(fieldErrors({ ...valid, company: 'Spam Inc' })).toHaveProperty('company');
  });
});

describe('siteLinks', () => {
  it('builds a WhatsApp link with an encoded message', () => {
    expect(siteLinks.whatsapp('Hi Prajzo! I need a website.')).toBe(
      'https://wa.me/919886607720?text=Hi%20Prajzo!%20I%20need%20a%20website.',
    );
    expect(siteLinks.whatsapp()).toBe('https://wa.me/919886607720');
  });
});
