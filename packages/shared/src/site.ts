/**
 * Prajzo's public contact details, used by the web app (footer, contact page, WhatsApp button)
 * and the API (where contact-form notifications go by default). Change them here only.
 */
export const siteContact = {
  email: 'contact@prajzo.com',
  /** Shown to people. */
  phoneDisplay: '+91 98866 07720',
  /** For tel: links (E.164 format). */
  phoneE164: '+919886607720',
  /** For https://wa.me/ links: country code and number, digits only. */
  whatsappNumber: '919886607720',
  instagramHandle: 'prajzoo',
} as const;

export const siteLinks = {
  email: `mailto:${siteContact.email}`,
  phone: `tel:${siteContact.phoneE164}`,
  instagram: `https://www.instagram.com/${siteContact.instagramHandle}/`,
  whatsapp: (message?: string) =>
    `https://wa.me/${siteContact.whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`,
} as const;
