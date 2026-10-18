import type { Category, ServicePackage } from '@prajzo/shared';

type DefaultCategory = Category & { sortOrder: number };
type DefaultPackage = ServicePackage & { sortOrder: number };

/** The 15 website categories from the brief. Loaded into the database when they are missing. */
export const defaultCategories: DefaultCategory[] = (
  [
    {
      key: 'forms-landing-pages',
      title: 'Forms and Landing Pages',
      description:
        'Single pages built for one job: collect registrations, take enquiries or promote an offer.',
      icon: 'ClipboardList',
      useCases: [
        'Event and workshop registrations',
        'Lead and enquiry forms',
        'Product or offer launch pages',
        'Feedback and survey pages',
      ],
      deliveryTier: 'quick',
    },
    {
      key: 'personal-portfolio',
      title: 'Personal Portfolio Websites',
      description:
        'A professional home for your work, skills and story, so clients and employers can find and trust you.',
      icon: 'UserRound',
      useCases: [
        'Designers, photographers and artists',
        'Developers and engineers',
        'Freelancers and consultants',
        'Students showcasing projects',
      ],
      deliveryTier: 'quick',
    },
    {
      key: 'business-websites',
      title: 'Business Websites',
      description:
        'Clear, fast websites that explain what you do, build trust and turn visitors into enquiries.',
      icon: 'Building2',
      useCases: [
        'Shops and local services',
        'Consultancies and agencies',
        'Clinics and studios',
        'Manufacturers and traders',
      ],
      deliveryTier: 'professional',
    },
    {
      key: 'college-education',
      title: 'College and Educational Websites',
      description:
        'Organised websites for courses, admissions, faculty and notices that students and parents can find their way around.',
      icon: 'GraduationCap',
      useCases: [
        'Colleges and schools',
        'Coaching and tuition centres',
        'Departments and clubs',
        'Online course pages',
      ],
      deliveryTier: 'professional',
    },
    {
      key: 'events-conferences',
      title: 'Event and Conference Websites',
      description:
        'Everything attendees need in one place: schedule, speakers, venue details and registration.',
      icon: 'CalendarDays',
      useCases: [
        'College fests and tech events',
        'Conferences and seminars',
        'Weddings and celebrations',
        'Workshops and meetups',
      ],
      deliveryTier: 'professional',
    },
    {
      key: 'ecommerce',
      title: 'E-commerce Websites',
      description:
        'Online stores and product catalogues with categories, product pages, and enquiry or ordering flows.',
      icon: 'ShoppingBag',
      useCases: [
        'Product catalogues',
        'Small online stores',
        'Wholesale enquiry websites',
        'WhatsApp ordering',
      ],
      deliveryTier: 'advanced',
    },
    {
      key: 'restaurant-food',
      title: 'Restaurant and Food Websites',
      description:
        'Menus, photos, opening hours, and table or order enquiries for restaurants, cafés and home kitchens.',
      icon: 'UtensilsCrossed',
      useCases: [
        'Restaurants and cafés',
        'Bakeries and sweet shops',
        'Cloud kitchens and caterers',
        'Food trucks',
      ],
      deliveryTier: 'professional',
    },
    {
      key: 'travel-booking',
      title: 'Travel and Booking Websites',
      description:
        'Show packages and destinations, and take booking requests with dates, travellers and preferences.',
      icon: 'Plane',
      useCases: [
        'Tour operators and travel agents',
        'Homestays and resorts',
        'Vehicle and cab rentals',
        'Trekking and adventure groups',
      ],
      deliveryTier: 'advanced',
    },
    {
      key: 'admin-dashboards',
      title: 'Admin Dashboards',
      description:
        'Private dashboards to manage records, follow numbers and run daily work from one screen.',
      icon: 'LayoutDashboard',
      useCases: [
        'Order and stock tracking',
        'Student or member records',
        'Sales and lead tracking',
        'Internal reports',
      ],
      deliveryTier: 'advanced',
    },
    {
      key: 'custom-web-apps',
      title: 'Custom Web Applications',
      description:
        'Web software built around how you work, with accounts, data and the features your team needs.',
      icon: 'AppWindow',
      useCases: ['Customer portals', 'Internal tools', 'Software products', 'Workflow automation'],
      deliveryTier: 'advanced',
    },
    {
      key: 'appointment-booking',
      title: 'Appointment and Booking Systems',
      description:
        'Let customers choose a service and a time slot, with confirmations and a simple schedule for you.',
      icon: 'CalendarCheck',
      useCases: [
        'Clinics and salons',
        'Consultants and coaches',
        'Classes and studios',
        'Service and repair visits',
      ],
      deliveryTier: 'advanced',
    },
    {
      key: 'digital-notice-boards',
      title: 'Digital Notice Boards',
      description:
        'Publish notices, circulars and announcements online, so everyone sees the latest updates.',
      icon: 'Megaphone',
      useCases: [
        'Colleges and schools',
        'Housing societies',
        'Offices and factories',
        'Community groups',
      ],
      deliveryTier: 'professional',
    },
    {
      key: 'printing-services',
      title: 'Printing and Service Websites',
      description:
        'Show your services and samples, share prices and take orders or quote requests online.',
      icon: 'Printer',
      useCases: [
        'Printing and signage shops',
        'Gift and invitation makers',
        'Repair and maintenance services',
        'Photography studios',
      ],
      deliveryTier: 'professional',
    },
    {
      key: 'resume-cv',
      title: 'Resume and CV Websites',
      description:
        'An online resume with your experience, skills and projects, easy to share as one link.',
      icon: 'IdCard',
      useCases: ['Job seekers', 'Fresh graduates', 'Professionals changing careers', 'Freelancers'],
      deliveryTier: 'quick',
    },
    {
      key: 'custom-development',
      title: 'Custom Website Development',
      description:
        "Have something different in mind? Tell us the idea and we'll plan the right solution with you.",
      icon: 'Wrench',
      useCases: [
        "Ideas that don't fit a category",
        'Redesigns of existing websites',
        'Connections to other tools',
        'Ongoing improvements',
      ],
      deliveryTier: 'custom',
    },
  ] satisfies Category[]
).map((category, index) => ({ ...category, sortOrder: (index + 1) * 10 }));

/**
 * The three packages, with the low starting prices chosen on 18 October 2026.
 * Prices are whole paise: 299900 = ₹2,999.
 */
export const defaultPackages: DefaultPackage[] = [
  {
    key: 'quick-launch',
    name: 'Quick Launch',
    summary: 'For one focused page that needs to go live fast.',
    deliveryTier: 'quick',
    scope: [
      'Single-page websites',
      'Landing pages',
      'Registration and enquiry forms',
      'Simple portfolios and resume sites',
      'Works on phones, tablets and computers',
    ],
    priceMode: 'from',
    priceAmountPaise: 299_900,
    currency: 'INR',
    sortOrder: 10,
  },
  {
    key: 'professional-website',
    name: 'Professional Website',
    summary: 'For a complete multi-page website for your business, portfolio or event.',
    deliveryTier: 'professional',
    scope: [
      'Small business websites',
      'Portfolio and event websites',
      'Multi-page information websites',
      'Contact form and WhatsApp button',
      'Basic search engine setup',
    ],
    priceMode: 'from',
    priceAmountPaise: 799_900,
    currency: 'INR',
    sortOrder: 20,
  },
  {
    key: 'advanced-development',
    name: 'Advanced Development',
    summary: 'For websites and apps that store data, have sign-ins or run your daily work.',
    deliveryTier: 'advanced',
    scope: [
      'Database-backed applications',
      'Admin dashboards',
      'User accounts and sign-in',
      'Booking and appointment systems',
      'Custom web applications',
    ],
    priceMode: 'from',
    priceAmountPaise: 1_999_900,
    currency: 'INR',
    sortOrder: 30,
  },
];
