/**
 * Website copy that isn't stored in the database. Kept in one place so it is easy to review
 * and change. Avoid claims we can't back up: no invented statistics, clients or reviews.
 */

export const processSteps = [
  {
    title: 'Share your idea',
    text: 'Tell us what you need through the contact form, WhatsApp or a call. A few lines are enough to start.',
  },
  {
    title: 'Get a clear quote',
    text: 'We review your requirements and send the scope, price and delivery date. Nothing starts until you approve it.',
  },
  {
    title: 'We design and build',
    text: 'We build your website step by step and share progress, so you always know where things stand.',
  },
  {
    title: 'Review and refine',
    text: 'You check everything on a preview link and ask for changes. The revisions in your quote are part of the price.',
  },
  {
    title: 'Launch',
    text: 'We put your website live on your domain and check that it works on phones, tablets and computers.',
  },
] as const;

export const reasonsToChoose = [
  {
    title: 'Clear prices from the start',
    text: 'Starting prices are published, and your final quote is agreed before any work begins.',
  },
  {
    title: 'Honest timelines',
    text: 'Delivery targets for eligible projects, and a confirmed date in writing after we review your needs.',
  },
  {
    title: 'Made for phones first',
    text: 'Most visitors arrive on a phone, so every website is designed for small screens first.',
  },
  {
    title: 'Talk to the people building it',
    text: 'Reach us directly on WhatsApp, by phone or by email while your project is being built.',
  },
  {
    title: 'Built to grow',
    text: 'Start with one page, then add pages, forms or a full web application when you need them.',
  },
  {
    title: 'Yours to keep',
    text: "Once your project is paid for, your website's content and files are handed over to you.",
  },
] as const;

export const customizationOptions = [
  {
    title: 'Pages and sections',
    text: 'Choose what your website includes, from one page to many.',
  },
  {
    title: 'Colours and fonts',
    text: 'Match your brand, or let us suggest a look that suits you.',
  },
  {
    title: 'Text and images',
    text: 'Your words and your photos, arranged to read well on any screen.',
  },
  {
    title: 'Features',
    text: 'Contact forms, WhatsApp buttons, galleries, bookings, dashboards and more.',
  },
] as const;

export const contentChecklist = [
  'A short description of your business or idea',
  'Your logo and brand colours, if you have them',
  'Text for your pages (we can help you write it)',
  'Photos, or examples of websites you like',
  'Access to your domain and hosting, if you already have them',
] as const;

export type Faq = { question: string; answer: string };

export const generalFaqs: Faq[] = [
  {
    question: 'How long does a website take?',
    answer:
      'Small projects such as a single page can target delivery within 24 hours, professional websites within 3 days, and eligible advanced projects within 7 days. These are targets, not guarantees: they depend on the scope, how ready your content is, integrations, testing and your approvals. We confirm a delivery date after reviewing your project.',
  },
  {
    question: 'How much will my website cost?',
    answer:
      'Each package has a published starting price on our Pricing page. Your final price depends on your pages, features and content, and we confirm it in a quote before any work starts.',
  },
  {
    question: 'What do I need to provide?',
    answer:
      "Your logo if you have one, the text for your pages, photos, and examples of websites you like. Don't have everything ready? We can help you plan the content.",
  },
  {
    question: 'Will my website work on mobile phones?',
    answer:
      'Yes. Every website we build adapts to phones, tablets and computers, and we check it on each before launch.',
  },
  {
    question: 'Can I make changes after launch?',
    answer:
      "Yes. Tell us what you'd like to change. Small changes are quick, and anything beyond your original scope is quoted first.",
  },
  {
    question: 'Do you provide the domain and hosting?',
    answer:
      'We can set up a new domain and hosting for you, or use the ones you already have. Their costs are shown separately on your quote.',
  },
];

export const pricingFaqs: Faq[] = [
  {
    question: 'Why "starting from" prices?',
    answer:
      'Every project is different. The starting price covers the simplest version of each package, and your quote reflects your pages, features and content.',
  },
  {
    question: 'What can change the price?',
    answer:
      'The number of pages, custom design work, features such as booking, sign-in or payments, writing or photos you need from us, and connections to other tools.',
  },
  {
    question: 'Are the domain and hosting included?',
    answer:
      'No. Domain and hosting costs are separate and shown on your quote, or you can use ones you already own.',
  },
  {
    question: 'Are taxes included?',
    answer: 'Prices are in Indian Rupees. Any applicable taxes are shown on your quote.',
  },
];
