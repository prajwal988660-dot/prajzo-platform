import { describe, expect, it } from 'vitest';
import { callLink, emailLinkTo, internationalDigits, whatsappLinkTo } from './contact-links';

describe('internationalDigits', () => {
  it.each([
    ['9886607720', '919886607720'],
    ['98866 07720', '919886607720'],
    ['+91 98866 07720', '919886607720'],
    ['91 98866 07720', '919886607720'],
    ['09886607720', '919886607720'],
    ['+1 415 555 0132', '14155550132'],
  ])('reads %s as %s', (typed, expected) => {
    expect(internationalDigits(typed)).toBe(expected);
  });

  it.each(['', '12345', '+', 'call me', '1234567890123456'])('does not guess at %j', (typed) => {
    expect(internationalDigits(typed)).toBeNull();
  });
});

describe('callLink and whatsappLinkTo', () => {
  it('build links from a number typed in any usual way', () => {
    expect(callLink('98866 07720')).toBe('tel:+919886607720');
    expect(whatsappLinkTo('+91 98866 07720')).toBe('https://wa.me/919886607720');
  });

  it('put a message into the WhatsApp link, encoded', () => {
    expect(whatsappLinkTo('9886607720', 'Hi! About PRZ-2026-0001')).toBe(
      'https://wa.me/919886607720?text=Hi!%20About%20PRZ-2026-0001',
    );
  });

  it('give nothing for a number that cannot work', () => {
    expect(callLink('12345')).toBeNull();
    expect(whatsappLinkTo('12345')).toBeNull();
  });
});

describe('emailLinkTo', () => {
  it('opens a plain message to the address', () => {
    expect(emailLinkTo('asha@example.com')).toBe('mailto:asha@example.com');
  });

  it('fills in the subject and the start of the message, encoded', () => {
    expect(emailLinkTo('asha@example.com', 'Re: Your project & quote', 'Hi Asha,\n\n')).toBe(
      'mailto:asha@example.com?subject=Re%3A%20Your%20project%20%26%20quote&body=Hi%20Asha%2C%0A%0A',
    );
  });
});
