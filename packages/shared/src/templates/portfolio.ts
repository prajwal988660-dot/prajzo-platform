import type { WebsiteConfigInput } from '../site-config/config';
import { defineTemplate } from '../site-config/template';

/**
 * Demo 1: Portfolio (/demo/portfolio). Design brief: three looks (Daylight, Night Shift,
 * Botanical), one page with nine sections. Everyone and everything in it is made up (D-014):
 * the person, the studio and companies, the projects; pictures are illustrations
 * (npm run demo:images) and addresses use example.com.
 */

const themes = [
  {
    key: 'daylight',
    name: 'Daylight',
    colors: {
      primary: '#2b50d8',
      accent: '#c4472a',
      background: '#f6f7f9',
      surface: '#ffffff',
      text: '#15181e',
    },
  },
  {
    key: 'night-shift',
    name: 'Night Shift',
    colors: {
      primary: '#f0b44c',
      accent: '#7dd3c0',
      background: '#101215',
      surface: '#1a1d22',
      text: '#ebe8e2',
    },
  },
  {
    key: 'botanical',
    name: 'Botanical',
    colors: {
      primary: '#2f6b4f',
      accent: '#9a531c',
      background: '#eef2ed',
      surface: '#f9fbf8',
      text: '#1c2621',
    },
  },
];

const demo: WebsiteConfigInput = {
  schemaVersion: 1,
  template: { key: 'portfolio', version: 1 },
  site: {
    name: 'Tara Vaidya',
    tagline: 'Product designer in Pune',
    description:
      'Tara Vaidya designs calm, useful apps for busy people. A fictional portfolio, shown as a demo by Prajzo.',
  },
  design: {
    theme: 'daylight',
    colors: themes[0]!.colors,
    fonts: { heading: 'bricolage-grotesque', body: 'figtree' },
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
          content: { action: { label: 'Hire me', href: '#contact' } },
        },
        {
          id: 'hero',
          type: 'hero',
          variant: 'split',
          enabled: true,
          content: {
            eyebrow: 'Product designer · Pune',
            heading: 'I design calm, useful apps for busy people.',
            subheading:
              'Six years of turning messy everyday tasks into screens people enjoy using. Open to freelance projects from January.',
            primaryAction: { label: 'See my work', href: '#work' },
            secondaryAction: { label: 'Get in touch', href: '#contact' },
            image: {
              src: '/demo/portfolio/portrait.webp',
              alt: 'An illustrated portrait of Tara, a woman with short dark hair',
            },
          },
        },
        {
          id: 'about',
          type: 'about',
          variant: 'story',
          enabled: true,
          content: {
            heading: 'About me',
            paragraphs: [
              'I started as an illustrator and moved into product design when I realised the hardest drawing problem is a form that people fill in at a bus stop.',
              'Today I lead design at a small studio, working with founders from the first sketch to the version in people’s hands. I care about plain words, big tap targets and screens that still work on a slow connection.',
            ],
            facts: [
              { id: 'years', label: 'Designing products', value: '6 years' },
              { id: 'projects', label: 'Projects shipped', value: '40+' },
              { id: 'based', label: 'Working remotely', value: 'Pune' },
              { id: 'languages', label: 'English, Hindi, Marathi', value: '3 languages' },
            ],
          },
        },
        {
          id: 'skills',
          type: 'skills',
          variant: 'chips',
          enabled: true,
          content: {
            heading: 'Skills',
            groups: [
              {
                id: 'design',
                name: 'Design',
                skills: [
                  { id: 'ui', name: 'UI design', level: 5 },
                  { id: 'systems', name: 'Design systems', level: 4 },
                  { id: 'prototyping', name: 'Prototyping', level: 4 },
                  { id: 'illustration', name: 'Illustration', level: 4 },
                ],
              },
              {
                id: 'research',
                name: 'Research',
                skills: [
                  { id: 'interviews', name: 'User interviews', level: 4 },
                  { id: 'testing', name: 'Usability testing', level: 4 },
                  { id: 'journeys', name: 'Journey maps', level: 3 },
                ],
              },
              {
                id: 'tools',
                name: 'Tools',
                skills: [
                  { id: 'figma', name: 'Figma', level: 5 },
                  { id: 'framer', name: 'Framer', level: 3 },
                  { id: 'after-effects', name: 'After Effects', level: 3 },
                  { id: 'html-css', name: 'HTML and CSS', level: 3 },
                ],
              },
            ],
          },
        },
        {
          id: 'work',
          type: 'projects',
          variant: 'grid',
          enabled: true,
          content: {
            heading: 'Selected work',
            items: [
              {
                id: 'kirana-ledger',
                title: 'Kirana Ledger',
                summary:
                  'A bookkeeping app for neighbourhood grocers: credit customers, daily totals and reminders, in four languages.',
                tags: ['Mobile', 'Finance'],
                image: {
                  src: '/demo/portfolio/project-ledger.webp',
                  alt: 'Illustration of a phone showing a list of daily totals',
                },
              },
              {
                id: 'monsoon-commute',
                title: 'Monsoon Commute',
                summary:
                  'City bus timings with live delays, designed to work on slow connections and in bright sunlight.',
                tags: ['Transport', 'Maps'],
                image: {
                  src: '/demo/portfolio/project-commute.webp',
                  alt: 'Illustration of two bus routes with stops and a delay notice',
                },
              },
              {
                id: 'hampi-walks',
                title: 'Hampi Walks',
                summary:
                  'A booking site for small-group heritage walks, with guide profiles and a two-step checkout.',
                tags: ['Website', 'Tourism'],
                image: {
                  src: '/demo/portfolio/project-walks.webp',
                  alt: 'Illustration of a temple among green hills at sunset',
                },
              },
              {
                id: 'clinic-queue',
                title: 'Clinic Queue',
                summary:
                  'A token and waiting-room display for small clinics, so patients know when their turn is near.',
                tags: ['Healthcare', 'Display'],
                image: {
                  src: '/demo/portfolio/project-queue.webp',
                  alt: 'Illustration of a waiting-room screen and three waiting patients',
                },
              },
            ],
          },
        },
        {
          id: 'experience',
          type: 'experience',
          variant: 'timeline',
          enabled: true,
          content: {
            heading: 'Experience',
            items: [
              {
                id: 'tidewater',
                role: 'Lead Product Designer',
                organisation: 'Tidewater Studio',
                location: 'Pune',
                start: '2023',
                end: 'Present',
                summary: 'Lead a team of three designers on apps for early-stage founders.',
              },
              {
                id: 'saffron',
                role: 'Product Designer',
                organisation: 'Saffron Systems',
                location: 'Bengaluru',
                start: '2020',
                end: '2023',
                summary: 'Designed the merchant app and its design system, used by 12 teams.',
              },
              {
                id: 'kite-kettle',
                role: 'Junior UI Designer',
                organisation: 'Kite & Kettle Design',
                location: 'Pune',
                start: '2019',
                end: '2020',
              },
            ],
          },
        },
        {
          id: 'education',
          type: 'education',
          variant: 'timeline',
          enabled: true,
          content: {
            heading: 'Education',
            items: [
              {
                id: 'bdes',
                qualification: 'B.Des, Communication Design',
                institution: 'Sahyadri School of Design',
                start: '2015',
                end: '2019',
              },
            ],
          },
        },
        {
          id: 'contact',
          type: 'contact',
          variant: 'split',
          enabled: true,
          content: {
            heading: 'Let’s work together',
            intro: 'Tell me about your project. I reply within two working days.',
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
            text: 'Tara Vaidya is a fictional person. A demo by Prajzo.',
            showSocial: true,
          },
        },
      ],
    },
  ],
  contact: {
    email: 'tara@example.com',
    phone: '+91 00000 00000',
    whatsapp: '+91 00000 00000',
    location: 'Pune, India',
  },
  social: [
    { network: 'linkedin', url: 'https://www.linkedin.com/in/example' },
    { network: 'behance', url: 'https://www.behance.net/example' },
    { network: 'instagram', url: 'https://www.instagram.com/example' },
  ],
};

export const portfolioTemplate = defineTemplate({
  key: 'portfolio',
  version: 1,
  name: 'Portfolio',
  categories: ['personal-portfolio', 'resume-cv'],
  pages: [
    {
      type: 'home',
      required: true,
      sections: [
        'header',
        'hero',
        'about',
        'skills',
        'projects',
        'experience',
        'education',
        'contact',
        'footer',
      ],
    },
  ],
  sections: {
    header: { required: true, variants: ['minimal'] },
    hero: { required: true, variants: ['split', 'centered'] },
    about: { required: false, variants: ['story'], maxItems: 6 },
    skills: { required: false, variants: ['chips', 'bars'], maxItems: 30 },
    projects: { required: false, variants: ['grid', 'list'], maxItems: 12 },
    experience: { required: false, variants: ['timeline'], maxItems: 10 },
    education: { required: false, variants: ['timeline'], maxItems: 6 },
    contact: { required: false, variants: ['split'] },
    footer: { required: true, variants: ['simple'] },
  },
  design: {
    themes,
    fonts: {
      heading: ['bricolage-grotesque', 'fraunces', 'dm-serif-display'],
      body: ['figtree', 'manrope', 'dm-sans'],
    },
    buttonStyles: ['rounded', 'pill', 'square'],
    spacing: ['compact', 'comfortable', 'spacious'],
  },
  defaultConfig: demo,
});
