/**
 * Links for getting in touch with a customer. Phone numbers are stored as the customer typed them
 * (digits, spaces and "+"), so they are turned into the international form that tel: and
 * WhatsApp links need. A number without a country code is taken to be Indian (+91).
 */

/** The number as international digits ("919886607720"), or null when it can't be a phone number. */
export function internationalDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/** A tel: link, or null when the number can't be dialled. */
export function callLink(phone: string): string | null {
  const digits = internationalDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

/** A WhatsApp chat link, or null when the number can't be reached that way. */
export function whatsappLinkTo(phone: string, message?: string): string | null {
  const digits = internationalDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** An email link that opens the person's own mail app with a subject filled in. */
export function emailLinkTo(email: string, subject?: string, body?: string): string {
  const parts: string[] = [];
  if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
  if (body) parts.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${parts.length > 0 ? `?${parts.join('&')}` : ''}`;
}
