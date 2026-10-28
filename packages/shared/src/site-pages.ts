/**
 * What search engines and link previews are told about each page of the website (D-053).
 *
 * This one table is used in two places, so they can never disagree:
 *
 * - the server writes it into the page it sends. Link previews (WhatsApp, LinkedIn, X...) and many
 *   crawlers do not run JavaScript, so the title, description and sharing details have to be in
 *   the HTML itself.
 * - the web app uses it to update the tab title and description when a visitor moves between pages.
 *
 * The same table decides which addresses are in the sitemap, and which are "not found".
 */

export const siteName = 'Prajzo';

/** The words in the browser tab when a page has no name of its own (the home page). */
export const defaultTitle = 'Prajzo · Web development studio';

/** The picture shown when a page is shared, and what it shows (for people who can't see it). */
export const sharingImage = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'The Prajzo logo: two arrows pointing forward, and the name Prajzo.',
} as const;

/** The square logo, for search engines' business listings (a wide picture is not accepted there). */
export const logoImagePath = '/icon-512.png';

export interface PageMeta {
  /** The page's name: the tab says "name · Prajzo". The home page has none. */
  name?: string;
  /** What a search result shows under the title. Written for people, 60 to 160 characters. */
  description: string;
  /** Whether the page may be listed by search engines (and so is in the sitemap). */
  index: boolean;
}

/** Every page of the website that has a fixed address, by that address. */
export const sitePages = {
  '/': {
    description:
      'Prajzo is a web development studio. Websites, web apps and digital solutions, with published starting prices and a delivery date agreed before work begins.',
    index: true,
  },
  '/services': {
    name: 'Services',
    description:
      'Business websites, portfolios, online shops, booking systems and custom web apps. Each is quoted clearly before we start and works on every screen.',
    index: true,
  },
  '/how-it-works': {
    name: 'How It Works',
    description:
      'From idea to launch in five clear steps. You always know what happens next, what it costs and when your website will be ready.',
    index: true,
  },
  '/pricing': {
    name: 'Pricing and Plans',
    description:
      'Three packages with published starting prices. You get a clear quote with the final price and delivery date before any work begins.',
    index: true,
  },
  '/about': {
    name: 'About Us',
    description:
      'Prajzo is a web development studio. We design and build websites, web applications and digital solutions for businesses, institutions and individuals.',
    index: true,
  },
  '/contact': {
    name: 'Contact Us',
    description:
      'Have a question about a website or web application? Message, call or email Prajzo and we will reply, or tell us about your project.',
    index: true,
  },
  '/start-project': {
    name: 'Start a Project',
    description:
      'Tell us what you need. We review it and reply with questions, or a quote that includes the scope, price and delivery date.',
    index: true,
  },
  '/privacy': {
    name: 'Privacy Policy',
    description: 'How Prajzo collects, uses and protects your personal information.',
    index: true,
  },
  '/terms': {
    name: 'Terms and Conditions',
    description: 'The terms that apply when you use the Prajzo website and our services.',
    index: true,
  },
  // Pages that are for visitors already on the site: reachable, but not worth listing.
  '/login': {
    name: 'Sign in',
    description: 'Sign in to your Prajzo account to follow your projects.',
    index: false,
  },
  '/register': {
    name: 'Create an account',
    description: 'Create a Prajzo account to send project requests and follow your projects.',
    index: false,
  },
  '/forgot-password': {
    name: 'Reset your password',
    description: 'Ask for a link to choose a new password for your Prajzo account.',
    index: false,
  },
  '/reset-password': {
    name: 'Choose a new password',
    description:
      'Choose a new password for your Prajzo account, using the link we sent to your email.',
    index: false,
  },
  '/projects': {
    name: 'Our Projects',
    description:
      'Working demonstration websites built by Prajzo, each one live to try: open it, click around and send its contact form.',
    index: true,
  },
  '/templates': {
    name: 'Templates and Live Demos',
    description:
      'Website templates you can try before you choose: open a live demo, click around and send its contact form. Every website is then built for you.',
    index: true,
  },
  '/templates/business': {
    name: 'Business template',
    description:
      'A one-page website for shops, studios and service businesses, with services and prices, reviews, a gallery and a contact form. Try the live demo.',
    index: true,
  },
  '/templates/event': {
    name: 'College and Event template',
    description:
      'A one-page website for fests, conferences and workshops, with dates, a schedule, events to enter, guidelines and a registration form. Try the live demo.',
    index: true,
  },
  '/templates/portfolio': {
    name: 'Portfolio template',
    description:
      'A one-page portfolio for designers, developers and creative professionals, with projects, experience, skills and a contact form. Try the live demo.',
    index: true,
  },
  // Live demos are kept out of search results: the people in them are made up, and someone
  // searching for a name should never land on one (D-063). The Templates page is listed instead.
  '/demo/business': {
    name: 'Business demo',
    description:
      'A live demo of the Prajzo Business template: a one-page website for a fictional print studio, with services, reviews and a contact form that works.',
    index: false,
  },
  '/demo/event': {
    name: 'College and Event demo',
    description:
      'A live demo of the Prajzo College and Event template: a fictional two-day college fest with a schedule, events and a registration form that works.',
    index: false,
  },
  '/demo/portfolio': {
    name: 'Portfolio demo',
    description:
      'A live demo of the Prajzo Portfolio template: a one-page portfolio for a fictional product designer, with a contact form that works.',
    index: false,
  },
} as const satisfies Record<string, PageMeta>;

export type SitePagePath = keyof typeof sitePages;

/**
 * Parts of the website that are private. They open the web app (which asks people to sign in), but
 * are never listed, and are never in the sitemap.
 */
export const privateAreas = ['/account', '/admin', '/build', '/preview'] as const;

/** An address as the website treats it: no query, no trailing slash, lower case. */
export function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0] ?? '';
  const trimmed = withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : withoutQuery;
  return (trimmed || '/').toLowerCase();
}

/** The page at this address, if the website has one with a fixed address. */
export function pageAt(pathname: string): (PageMeta & { path: SitePagePath }) | undefined {
  const path = normalizePath(pathname);
  return Object.hasOwn(sitePages, path)
    ? { path: path as SitePagePath, ...sitePages[path as SitePagePath] }
    : undefined;
}

/** Whether this address is inside a private part of the website (such as /admin/projects). */
export function isPrivateArea(pathname: string): boolean {
  const path = normalizePath(pathname);
  return privateAreas.some((area) => path === area || path.startsWith(`${area}/`));
}

/** What an address is: a page with a fixed address, somewhere private, or nothing at all. */
export type AddressKind = 'page' | 'private' | 'unknown';

export function kindOfAddress(pathname: string): AddressKind {
  if (pageAt(pathname)) return 'page';
  return isPrivateArea(pathname) ? 'private' : 'unknown';
}

/** The full title for the browser tab. */
export function fullTitle(name?: string): string {
  return name ? `${name} · ${siteName}` : defaultTitle;
}

/** What a page without a description of its own says about the site (the home page's). */
export const defaultDescription = sitePages['/'].description;

/** Every address in the table, in its order. */
export const pagePaths = Object.keys(sitePages) as SitePagePath[];

/** The addresses that belong in the sitemap, in the order of the table. */
export const indexablePaths = pagePaths.filter((path) => sitePages[path].index);
