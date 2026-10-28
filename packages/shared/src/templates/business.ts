import type { WebsiteConfigInput } from '../site-config/config';
import { defineTemplate } from '../site-config/template';

/**
 * Demo 2: Business (/demo/business). Design brief: three looks (Harbour, Indigo Night,
 * Terracotta), one page with ten sections. The business, its customers and their reviews are made
 * up (D-014); reviews are labelled as samples on the demo; pictures are drawn
 * (npm run demo:images); addresses use example.com.
 */

const themes = [
  {
    key: 'harbour',
    name: 'Harbour',
    colors: {
      primary: '#0e7c6b',
      accent: '#a14a07',
      background: '#f7f8f7',
      surface: '#ffffff',
      text: '#13201f',
    },
  },
  {
    key: 'indigo-night',
    name: 'Indigo Night',
    colors: {
      primary: '#f2a93b',
      accent: '#8fb8ff',
      background: '#12131a',
      surface: '#1b1d27',
      text: '#ecebf3',
    },
  },
  {
    key: 'terracotta',
    name: 'Terracotta',
    colors: {
      primary: '#7a2e1d',
      accent: '#2f6b4f',
      background: '#f6f1ea',
      surface: '#fffdf9',
      text: '#2a1d17',
    },
  },
];

const demo: WebsiteConfigInput = {
  schemaVersion: 1,
  template: { key: 'business', version: 1 },
  site: {
    name: 'Tamarind Lane Print Studio',
    tagline: 'Print and signage in Mysuru',
    description:
      'Shop signs, visiting cards and banners, designed, printed and fitted in Mysuru. A fictional business, shown as a demo by Prajzo.',
  },
  design: {
    theme: 'harbour',
    colors: themes[0]!.colors,
    fonts: { heading: 'sora', body: 'inter' },
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
          content: {
            brandText: 'Tamarind Lane',
            action: { label: 'Get a quote', href: '#contact' },
          },
        },
        {
          id: 'hero',
          type: 'hero',
          variant: 'band',
          enabled: true,
          content: {
            eyebrow: 'Print and signage · Mysuru',
            heading: 'Signs, cards and banners, printed by Friday.',
            subheading:
              'A small studio with big machines. We design, print and fit everything from visiting cards to shop signs, with the price agreed before we start.',
            primaryAction: { label: 'Get a quote', href: '#contact' },
            secondaryAction: { label: 'See our work', href: '#work' },
            image: {
              src: '/demo/business/studio.webp',
              alt: 'Illustration of a large shop sign standing in front of a print studio',
            },
            stats: [
              { id: 'years', value: '12 yrs', label: 'in Mysuru' },
              { id: 'turnaround', value: '3 days', label: 'usual turnaround' },
              { id: 'shops', value: '900+', label: 'shops served' },
            ],
          },
        },
        {
          id: 'services',
          type: 'services',
          variant: 'cards',
          enabled: true,
          content: {
            heading: 'What we do',
            intro: 'Everything a shop, clinic or school needs to be seen.',
            items: [
              {
                id: 'signs',
                title: 'Shop signs',
                description: 'Flex, acrylic and lit boards, designed, printed and fitted.',
                priceNote: 'From ₹2,500',
                icon: 'sign',
              },
              {
                id: 'cards',
                title: 'Visiting cards',
                description: 'Matt, gloss or textured, in packs of 500 and 1,000.',
                priceNote: 'From ₹450',
                icon: 'card',
              },
              {
                id: 'banners',
                title: 'Banners and standees',
                description: 'For events, sales and openings. Weatherproof, ready in a day.',
                priceNote: 'From ₹800',
                icon: 'banner',
              },
              {
                id: 'stationery',
                title: 'Letterheads and bills',
                description: 'Bill books, letterheads and envelopes with your logo.',
                priceNote: 'From ₹1,200',
                icon: 'printer',
              },
              {
                id: 'design',
                title: 'Design help',
                description: 'No logo yet? We design one with you before we print.',
                icon: 'brush',
              },
              {
                id: 'fitting',
                title: 'Delivery and fitting',
                description: 'We bring it and put it up, within 10 km of the city.',
                icon: 'truck',
              },
            ],
          },
        },
        {
          id: 'why-us',
          type: 'highlights',
          variant: 'grid',
          enabled: true,
          content: {
            heading: 'Why shops choose us',
            items: [
              {
                id: 'proof',
                title: 'Proof first',
                text: 'You approve a proof on WhatsApp before we print.',
              },
              {
                id: 'price',
                title: 'Fair prices',
                text: 'The quote is the price. No surprises on the bill.',
              },
              {
                id: 'fitting',
                title: 'Fitting included',
                text: 'Signs are fitted for free within the city.',
              },
              {
                id: 'updates',
                title: 'Updates as we go',
                text: 'We message you when it is printed and ready.',
              },
            ],
          },
        },
        {
          id: 'work',
          type: 'gallery',
          variant: 'grid',
          enabled: true,
          content: {
            heading: 'Recent work',
            items: [
              {
                id: 'bakery',
                image: {
                  src: '/demo/business/gallery-bakery.webp',
                  alt: 'Illustration of a round lit sign above a bakery counter',
                },
                caption: 'Bakery sign, lit at night',
              },
              {
                id: 'clinic',
                image: {
                  src: '/demo/business/gallery-clinic.webp',
                  alt: 'Illustration of a clinic window sticker with a cross',
                },
                caption: 'Clinic window graphics',
              },
              {
                id: 'banner',
                image: {
                  src: '/demo/business/gallery-banner.webp',
                  alt: 'Illustration of a large banner on two poles',
                },
                caption: 'Festival banner, 6 metres',
              },
              {
                id: 'cards',
                image: {
                  src: '/demo/business/gallery-cards.webp',
                  alt: 'Illustration of two printed cards',
                },
                caption: 'School ID cards',
              },
            ],
          },
        },
        {
          id: 'about',
          type: 'about',
          variant: 'story',
          enabled: true,
          content: {
            heading: 'About the studio',
            paragraphs: [
              'Tamarind Lane started in 2014 with one printer and a shop shutter. Today a team of six designs, prints and fits work for more than 900 shops, clinics and schools.',
              'We keep it simple: you tell us what you need, we send a price and a proof, and you get it on the day we said.',
            ],
            facts: [],
          },
        },
        {
          id: 'reviews',
          type: 'testimonials',
          variant: 'cards',
          enabled: true,
          content: {
            heading: 'What customers say',
            items: [
              {
                id: 'meena',
                quote: 'Our new sign went up in three days and people finally find the shop.',
                name: 'Meena',
                role: 'bakery owner',
              },
              {
                id: 'rao',
                quote: 'They sent a proof on WhatsApp within the hour.',
                name: 'Dr Rao',
                role: 'clinic',
              },
              {
                id: 'arjun',
                quote: 'Fair price, no surprises, and they fitted it on a Sunday.',
                name: 'Arjun',
                role: 'hardware store',
              },
            ],
          },
        },
        {
          id: 'call',
          type: 'cta',
          variant: 'band',
          enabled: true,
          content: {
            heading: 'Need something printed this week?',
            text: 'Send us what you need. We reply with a price the same day.',
            action: { label: 'Get a quote', href: '#contact' },
          },
        },
        {
          id: 'contact',
          type: 'contact',
          variant: 'split',
          enabled: true,
          content: {
            heading: 'Visit or write to us',
            intro:
              'Open Monday to Saturday, 9 am to 7 pm. Tell us what you need and we will send a price.',
            showForm: true,
            showDetails: true,
          },
        },
        {
          id: 'footer',
          type: 'footer',
          variant: 'simple',
          enabled: true,
          content: {
            text: 'Tamarind Lane Print Studio is a fictional business. A demo by Prajzo.',
            showSocial: true,
          },
        },
      ],
    },
  ],
  contact: {
    email: 'hello@example.com',
    phone: '+91 00000 00000',
    whatsapp: '+91 00000 00000',
    location: 'Mysuru, Karnataka',
  },
  social: [
    { network: 'instagram', url: 'https://www.instagram.com/example' },
    { network: 'facebook', url: 'https://www.facebook.com/example' },
  ],
};

export const businessTemplate = defineTemplate({
  key: 'business',
  version: 1,
  name: 'Business',
  categories: ['business-websites', 'printing-services'],
  pages: [
    {
      type: 'home',
      required: true,
      sections: [
        'header',
        'hero',
        'services',
        'highlights',
        'gallery',
        'about',
        'testimonials',
        'cta',
        'contact',
        'footer',
      ],
    },
  ],
  sections: {
    header: { required: true, variants: ['minimal'] },
    hero: { required: true, variants: ['band', 'banner'] },
    services: { required: false, variants: ['cards', 'list'], maxItems: 9 },
    highlights: { required: false, variants: ['grid'], maxItems: 6 },
    gallery: { required: false, variants: ['grid'], maxItems: 12 },
    about: { required: false, variants: ['story'], maxItems: 6 },
    testimonials: { required: false, variants: ['cards'], maxItems: 6 },
    cta: { required: false, variants: ['band'] },
    contact: { required: false, variants: ['split'] },
    footer: { required: true, variants: ['simple'] },
  },
  design: {
    themes,
    fonts: {
      heading: ['sora', 'fraunces', 'dm-serif-display'],
      body: ['inter', 'manrope', 'dm-sans'],
    },
    buttonStyles: ['rounded', 'pill', 'square'],
    spacing: ['compact', 'comfortable', 'spacious'],
  },
  defaultConfig: demo,
});
