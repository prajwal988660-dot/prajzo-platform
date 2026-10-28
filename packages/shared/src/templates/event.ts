import type { WebsiteConfigInput } from '../site-config/config';
import { defineTemplate } from '../site-config/template';

/**
 * Demo 3: College and Event (/demo/event). Design brief: three looks (Spectrum, Campus Blue,
 * Night Stage), one page with nine sections. The fest, its college and its events are made up
 * (D-014); registrations go to the demo inbox only; addresses use example.com.
 */

const themes = [
  {
    key: 'spectrum',
    name: 'Spectrum',
    colors: {
      primary: '#5b21b6',
      accent: '#be185d',
      background: '#faf7ff',
      surface: '#ffffff',
      text: '#1e1033',
    },
  },
  {
    key: 'campus-blue',
    name: 'Campus Blue',
    colors: {
      primary: '#1e3a8a',
      accent: '#a14a07',
      background: '#f6f8fb',
      surface: '#ffffff',
      text: '#0f1b2d',
    },
  },
  {
    key: 'night-stage',
    name: 'Night Stage',
    colors: {
      primary: '#facc15',
      accent: '#67e8f9',
      background: '#0d0b14',
      surface: '#17141f',
      text: '#f1edf8',
    },
  },
];

const events = ['Hackathon', 'Robo race', 'Battle of the bands', 'Street play', 'Quiz'];

const demo: WebsiteConfigInput = {
  schemaVersion: 1,
  template: { key: 'event', version: 1 },
  site: {
    name: 'Spectra 2027',
    tagline: 'A two-day college tech and culture fest',
    description:
      'Spectra 2027: two days of coding, robots, music and theatre in Mangaluru. A fictional event, shown as a demo by Prajzo.',
  },
  design: {
    theme: 'spectrum',
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
          content: { action: { label: 'Register', href: '#register' } },
        },
        {
          id: 'hero',
          type: 'hero',
          variant: 'banner',
          enabled: true,
          content: {
            eyebrow: '12–13 February 2027 · Mangaluru',
            heading: 'Spectra 2027',
            subheading:
              'Two days of coding, robots, music and theatre. 40 colleges, 18 events, one stage.',
            primaryAction: { label: 'Register your team', href: '#register' },
            secondaryAction: { label: 'See the schedule', href: '#schedule' },
            stats: [],
          },
        },
        {
          id: 'facts',
          type: 'facts',
          variant: 'cards',
          enabled: true,
          content: {
            items: [
              { id: 'when', label: 'When', value: '12–13 February 2027', icon: 'calendar' },
              { id: 'time', label: 'Time', value: '9 am to 9 pm, both days', icon: 'clock' },
              { id: 'where', label: 'Where', value: 'Main campus, Mangaluru', icon: 'map' },
            ],
          },
        },
        {
          id: 'schedule',
          type: 'schedule',
          variant: 'columns',
          enabled: true,
          content: {
            heading: 'Schedule',
            days: [
              {
                id: 'day-1',
                name: 'Day 1 · Friday 12 February',
                slots: [
                  {
                    id: 'opening',
                    time: '9:00',
                    title: 'Opening ceremony',
                    place: 'Open-air theatre',
                  },
                  {
                    id: 'hackathon',
                    time: '10:30',
                    title: '24-hour hackathon begins',
                    place: 'Computer block',
                  },
                  { id: 'quiz', time: '14:00', title: 'Quiz, first rounds', place: 'Seminar hall' },
                  { id: 'bands', time: '18:00', title: 'Battle of the bands', place: 'Main stage' },
                ],
              },
              {
                id: 'day-2',
                name: 'Day 2 · Saturday 13 February',
                slots: [
                  { id: 'robo', time: '10:00', title: 'Robo race finals', place: 'Sports ground' },
                  {
                    id: 'hack-end',
                    time: '10:30',
                    title: 'Hackathon demos',
                    place: 'Computer block',
                  },
                  { id: 'play', time: '14:00', title: 'Street play', place: 'Quadrangle' },
                  {
                    id: 'prizes',
                    time: '19:00',
                    title: 'Prize giving and concert',
                    place: 'Main stage',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'events',
          type: 'services',
          variant: 'cards',
          enabled: true,
          content: {
            heading: 'Events you can enter',
            intro: 'Teams can enter more than one event. Prizes in every event.',
            items: [
              {
                id: 'hackathon',
                title: 'Hackathon',
                description:
                  'Build something useful for your city in 24 hours. Food and coffee on us.',
                priceNote: 'Teams of 2–4 · ₹400 a team',
                icon: 'sparkles',
              },
              {
                id: 'robo',
                title: 'Robo race',
                description: 'Your robot against our obstacle course, against the clock.',
                priceNote: 'Teams of up to 3 · ₹300',
                icon: 'star',
              },
              {
                id: 'bands',
                title: 'Battle of the bands',
                description: 'Eight minutes on the main stage, any style of music.',
                priceNote: 'Bands of up to 6 · ₹500',
                icon: 'clock',
              },
              {
                id: 'play',
                title: 'Street play',
                description: 'Fifteen minutes, a theme announced on the day, no microphones.',
                priceNote: 'Teams of 6–12 · ₹300',
                icon: 'brush',
              },
              {
                id: 'quiz',
                title: 'Quiz',
                description: 'Science, sport, films and Mangaluru. Three rounds and a final.',
                priceNote: 'Pairs · ₹100',
                icon: 'shield',
              },
            ],
          },
        },
        {
          id: 'guidelines',
          type: 'guidelines',
          variant: 'numbered',
          enabled: true,
          content: {
            heading: 'Guidelines',
            items: [
              { id: 'id-card', text: 'Bring your college ID card on both days.' },
              { id: 'deadline', text: 'Register by 5 February. Places in each event are limited.' },
              { id: 'teams', text: 'Every team member must be a student of the same college.' },
              { id: 'judges', text: 'The judges’ decision is final.' },
            ],
          },
        },
        {
          id: 'register',
          type: 'registration',
          variant: 'form',
          enabled: true,
          content: {
            heading: 'Register',
            intro: 'One form for each team. We confirm your place by email within two days.',
            eventLabel: 'Event',
            events,
            askPhone: true,
            askOrganisation: true,
            organisationLabel: 'College',
            closingNote: 'We will email you within two days.',
          },
        },
        {
          id: 'contact',
          type: 'contact',
          variant: 'split',
          enabled: true,
          content: {
            heading: 'Questions?',
            intro: 'Write to the student committee. We answer within a day.',
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
            text: 'Spectra 2027 is a fictional event. A demo by Prajzo.',
            showSocial: true,
          },
        },
      ],
    },
  ],
  contact: {
    email: 'fest@example.com',
    phone: '+91 00000 00000',
    whatsapp: '+91 00000 00000',
    location: 'Mangaluru, Karnataka',
  },
  social: [{ network: 'instagram', url: 'https://www.instagram.com/example' }],
};

export const eventTemplate = defineTemplate({
  key: 'event',
  version: 1,
  name: 'College and Event',
  categories: ['college-education', 'events-conferences'],
  pages: [
    {
      type: 'home',
      required: true,
      sections: [
        'header',
        'hero',
        'facts',
        'schedule',
        'services',
        'guidelines',
        'registration',
        'gallery',
        'contact',
        'footer',
      ],
    },
  ],
  sections: {
    header: { required: true, variants: ['minimal'] },
    hero: { required: true, variants: ['banner', 'band'] },
    facts: { required: false, variants: ['cards'], maxItems: 4 },
    schedule: { required: false, variants: ['columns', 'list'], maxItems: 40 },
    services: { required: false, variants: ['cards', 'list'], maxItems: 12 },
    guidelines: { required: false, variants: ['numbered'], maxItems: 12 },
    registration: { required: false, variants: ['form'], maxItems: 20 },
    gallery: { required: false, variants: ['grid'], maxItems: 12 },
    contact: { required: false, variants: ['split'] },
    footer: { required: true, variants: ['simple'] },
  },
  design: {
    themes,
    fonts: {
      heading: ['bricolage-grotesque', 'sora', 'fraunces'],
      body: ['figtree', 'inter', 'manrope'],
    },
    buttonStyles: ['rounded', 'pill', 'square'],
    spacing: ['compact', 'comfortable', 'spacious'],
  },
  defaultConfig: demo,
});
