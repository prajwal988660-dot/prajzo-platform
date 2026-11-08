import type { WebsiteConfigInput } from '../site-config/config';
import { defineTemplate } from '../site-config/template';

/**
 * Demo 4: Product Catalogue (/demo/catalogue). Design brief: three looks (Indigo, Market Day,
 * Charcoal), one page with seven sections, enquiries instead of a checkout. The shop and its
 * products are made up (D-014); products are marked Sample on the demo; enquiries go to the demo
 * inbox only; WhatsApp shows the message it would send; addresses use example.com.
 */

const themes = [
  {
    key: 'indigo',
    name: 'Indigo',
    colors: {
      primary: '#2e3a8c',
      accent: '#a3401c',
      background: '#f6f7fb',
      surface: '#ffffff',
      text: '#191c2e',
    },
  },
  {
    key: 'market-day',
    name: 'Market Day',
    colors: {
      primary: '#0f766e',
      accent: '#9d174d',
      background: '#f7faf9',
      surface: '#ffffff',
      text: '#10201d',
    },
  },
  {
    key: 'charcoal',
    name: 'Charcoal',
    colors: {
      primary: '#f59e0b',
      accent: '#7dd3fc',
      background: '#121212',
      surface: '#1c1c1c',
      text: '#f1efea',
    },
  },
];

const product = (
  id: string,
  name: string,
  category: string,
  priceNote: string,
  summary: string,
  details: string[],
  pictureOf: string,
) => ({
  id,
  name,
  category,
  priceNote,
  summary,
  details,
  image: {
    src: `/demo/catalogue/product-${id}.webp`,
    alt: `Illustration of the woven pattern of ${pictureOf}`,
  },
});

const demo: WebsiteConfigInput = {
  schemaVersion: 1,
  template: { key: 'catalogue', version: 1 },
  site: {
    name: 'Indigo Loom',
    tagline: 'Handwoven cotton from Hassan',
    description:
      'Handwoven cushion covers, bedspreads and table linen from a family of weavers in Hassan. A fictional shop, shown as a demo by Prajzo.',
  },
  design: {
    theme: 'indigo',
    colors: themes[0]!.colors,
    fonts: { heading: 'fraunces', body: 'dm-sans' },
    buttonStyle: 'rounded',
    spacing: 'comfortable',
  },
  pages: [
    {
      id: 'home',
      type: 'home',
      title: 'Home',
      slug: '',
      enabled: true,
      showInNav: true,
      sections: [
        {
          id: 'header',
          type: 'header',
          variant: 'minimal',
          enabled: true,
          content: { action: { label: 'Send an enquiry', href: '#enquire' } },
        },
        {
          id: 'hero',
          type: 'hero',
          variant: 'split',
          enabled: true,
          content: {
            eyebrow: 'Handwoven in Hassan',
            heading: 'Cotton for every room, woven by hand.',
            subheading:
              'Cushion covers, bedspreads and table linen from a family of weavers. Ask about any piece: we reply with the price and delivery time.',
            primaryAction: { label: 'See the products', href: '#products' },
            secondaryAction: { label: 'Send an enquiry', href: '#enquire' },
            image: {
              src: '/demo/catalogue/hero.webp',
              alt: 'Illustration of a stack of folded handwoven cloths in four colours',
            },
            stats: [],
          },
        },
        {
          id: 'products',
          type: 'products',
          variant: 'grid',
          enabled: true,
          content: {
            heading: 'Products',
            intro: 'Every piece is woven to order. Prices include delivery anywhere in India.',
            showFilters: true,
            items: [
              product(
                'ikat-cushion',
                'Ikat cushion cover',
                'Cushions',
                '₹650',
                'Zigzag ikat in indigo and rust, with a hidden zip.',
                ['40 × 40 cm, cushion not included', 'Handwoven cotton', 'Ready in 5 days'],
                'an ikat cushion cover',
              ),
              product(
                'check-cushions',
                'Check cushion set of 2',
                'Cushions',
                '₹1,100',
                'Two covers in a soft teal and sand check.',
                ['45 × 45 cm each', 'Machine washable', 'Ready in 5 days'],
                'two check cushion covers',
              ),
              product(
                'stripe-cushion',
                'Indigo stripe cushion cover',
                'Cushions',
                '₹600',
                'Narrow and wide stripes in deep indigo.',
                ['40 × 40 cm', 'Handwoven cotton'],
                'a striped cushion cover',
              ),
              product(
                'double-bedspread',
                'Double bedspread',
                'Bedding',
                '₹2,400',
                'A bold check that covers a double bed with room to tuck in.',
                ['225 × 270 cm', 'Heavy cotton, softens with every wash', 'Ready in 10 days'],
                'a check bedspread',
              ),
              product(
                'single-bedspread',
                'Single bedspread',
                'Bedding',
                '₹1,500',
                'Teal stripes on a light ground, for a single bed.',
                ['150 × 225 cm', 'Machine washable'],
                'a striped single bedspread',
              ),
              product(
                'kantha-quilt',
                'Kantha-stitch quilt',
                'Bedding',
                '₹3,800',
                'Two layers of cotton held by hand stitching in rows.',
                ['220 × 260 cm', 'Hand stitched, takes 3 weeks', 'Each one slightly different'],
                'a kantha-stitched quilt',
              ),
              product(
                'table-runner',
                'Striped table runner',
                'Table linen',
                '₹780',
                'Rust and sand stripes for a six-seater table.',
                ['35 × 180 cm', 'Machine washable'],
                'a striped table runner',
              ),
              product(
                'napkins',
                'Napkin set of 6',
                'Table linen',
                '₹720',
                'Small checks in indigo and coral.',
                ['45 × 45 cm each', 'Six napkins'],
                'checked napkins',
              ),
              product(
                'tablecloth',
                'Ikat tablecloth',
                'Table linen',
                '₹1,650',
                'A six-seater cloth in teal and indigo ikat.',
                ['150 × 230 cm', 'Ready in 7 days'],
                'an ikat tablecloth',
              ),
            ],
          },
        },
        {
          id: 'why-us',
          type: 'highlights',
          variant: 'grid',
          enabled: true,
          content: {
            heading: 'Why buy from us',
            items: [
              {
                id: 'weavers',
                title: 'Straight from the weavers',
                text: 'No middlemen: the weavers are paid fairly for every piece.',
              },
              {
                id: 'order',
                title: 'Woven to order',
                text: 'Ask for other sizes and colours. We tell you the price first.',
              },
              {
                id: 'delivery',
                title: 'Delivery included',
                text: 'Anywhere in India, usually within 10 days.',
              },
              {
                id: 'reply',
                title: 'A reply within a day',
                text: 'Every enquiry is answered by a person, not a bot.',
              },
            ],
          },
        },
        {
          id: 'enquire',
          type: 'enquiry',
          variant: 'form',
          enabled: true,
          content: {
            heading: 'Send an enquiry',
            intro:
              'Tell us what you need. We reply with the price and delivery time within a day. There is no payment online.',
            askPhone: true,
            askQuantity: true,
            closingNote: 'We will reply within a day.',
          },
        },
        {
          id: 'contact',
          type: 'contact',
          variant: 'split',
          enabled: true,
          content: {
            heading: 'Visit the workshop',
            intro: 'Open Monday to Saturday, 10 am to 6 pm. Call before you come.',
            showForm: false,
            showDetails: true,
          },
        },
        {
          id: 'footer',
          type: 'footer',
          variant: 'simple',
          enabled: true,
          content: {
            text: 'Indigo Loom and its products are fictional. A demo by Prajzo.',
            showSocial: true,
          },
        },
      ],
    },
  ],
  contact: {
    email: 'orders@example.com',
    phone: '+91 00000 00000',
    whatsapp: '+91 00000 00000',
    location: 'Hassan, Karnataka',
  },
  social: [{ network: 'instagram', url: 'https://www.instagram.com/example' }],
};

export const catalogueTemplate = defineTemplate({
  key: 'catalogue',
  version: 1,
  name: 'Product Catalogue',
  categories: ['ecommerce'],
  pages: [
    {
      type: 'home',
      required: true,
      sections: [
        'header',
        'hero',
        'products',
        'highlights',
        'testimonials',
        'enquiry',
        'contact',
        'footer',
      ],
    },
  ],
  sections: {
    header: { required: true, variants: ['minimal'] },
    hero: { required: true, variants: ['split', 'band'] },
    products: { required: true, variants: ['grid'], maxItems: 48 },
    highlights: { required: false, variants: ['grid'], maxItems: 6 },
    testimonials: { required: false, variants: ['cards'], maxItems: 6 },
    enquiry: { required: false, variants: ['form'] },
    contact: { required: false, variants: ['split'] },
    footer: { required: true, variants: ['simple'] },
  },
  design: {
    themes,
    fonts: {
      heading: ['fraunces', 'sora', 'bricolage-grotesque'],
      body: ['dm-sans', 'inter', 'manrope'],
    },
    buttonStyles: ['rounded', 'pill', 'square'],
    spacing: ['compact', 'comfortable', 'spacious'],
  },
  defaultConfig: demo,
});
