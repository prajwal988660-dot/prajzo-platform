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
};
