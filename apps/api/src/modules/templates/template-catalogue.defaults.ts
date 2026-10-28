import type { TemplateKey } from '@prajzo/shared';

/**
 * Each template's first catalogue listing. Added once, when a database doesn't have it yet;
 * after that administrators edit it, and these words are never written over their changes.
 */
export const defaultTemplateEntries: Partial<
  Record<
    TemplateKey,
    {
      name: string;
      tagline: string;
      description: string;
      categories: string[];
      features: string[];
      featured: boolean;
      published: boolean;
      order: number;
      previewAlt: string;
    }
  >
> = {
  portfolio: {
    name: 'Portfolio',
    tagline: 'A one-page portfolio for designers, developers and creative professionals.',
    description:
      'Introduce yourself, show your best work and let people get in touch, all on one page. It has a story-style introduction, skills, selected projects, experience and education, and a contact form. Three looks to start from, and it works on phones, tablets and computers.',
    categories: ['personal-portfolio', 'resume-cv'],
    features: [
      'Hero with your photo and two buttons',
      'About you, with quick facts',
      'Skills as chips or bars',
      'Projects as a grid or a list, up to 12',
      'Experience and education timeline',
      'Contact form, email, phone and WhatsApp',
      'Social profile links',
      'Three looks: Daylight, Night Shift and Botanical',
    ],
    featured: true,
    published: true,
    order: 1,
    previewAlt:
      'The Portfolio demo on a computer screen: a designer’s introduction with an illustrated portrait, and her selected work below.',
  },
  business: {
    name: 'Business',
    tagline: 'A one-page website for shops, studios and service businesses.',
    description:
      'Show what you offer and what it costs, why customers choose you, your recent work and what people say, with a quote button on every screen and a contact form. Three looks to start from, and it works on phones, tablets and computers.',
    categories: ['business-websites', 'printing-services'],
    features: [
      'Hero on a coloured band, with three big numbers',
      'Services as cards or a list, with prices',
      'Why choose us highlights',
      'Gallery of recent work',
      'Customer reviews',
      'Call-to-action band',
      'Contact form, email, phone and WhatsApp',
      'Three looks: Harbour, Indigo Night and Terracotta',
    ],
    featured: true,
    published: true,
    order: 2,
    previewAlt:
      'The Business demo on a computer screen: a print studio’s headline on a teal band with its numbers, and its services below.',
  },
};
