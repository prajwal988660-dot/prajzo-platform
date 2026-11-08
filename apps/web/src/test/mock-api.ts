import {
  projectStatuses,
  type AdminCategory,
  type AdminContactMessage,
  type AdminCustomer,
  type AdminOverview,
  type AdminPackage,
  type AdminProjectDetail,
  type AdminProjectSummary,
  type AuditEntry,
  type Category,
  type ProjectDetail,
  type ProjectStatus,
  type ProjectSummary,
  type Quote,
  type ServicePackage,
  type TemplateEntry,
} from '@prajzo/shared';
import { vi } from 'vitest';

type Handler = (init: RequestInit | undefined) => Response | Promise<Response>;

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Replaces `fetch` with a fake API. Keys look like "GET /api/v1/categories". Unknown routes
 * answer 404 in the API's error format.
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const handler = routes[`${method} ${url}`];
    if (!handler) {
      return Promise.resolve(
        jsonResponse(404, {
          error: { code: 'NOT_FOUND', message: `No mock for ${method} ${url}` },
        }),
      );
    }
    return Promise.resolve().then(() => handler(init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const sampleCategories: Category[] = [
  {
    key: 'business-websites',
    title: 'Business Websites',
    description: 'Clear, fast websites that explain what you do.',
    icon: 'Building2',
    useCases: ['Shops and local services'],
    deliveryTier: 'professional',
  },
  {
    key: 'personal-portfolio',
    title: 'Personal Portfolio Websites',
    description: 'A professional home for your work.',
    icon: 'UserRound',
    useCases: ['Designers and artists'],
    deliveryTier: 'quick',
  },
];

export const samplePackages: ServicePackage[] = [
  {
    key: 'quick-launch',
    name: 'Quick Launch',
    summary: 'One focused page, fast.',
    deliveryTier: 'quick',
    scope: ['Landing pages'],
    priceMode: 'from',
    priceAmountPaise: 299_900,
    currency: 'INR',
  },
  {
    key: 'professional-website',
    name: 'Professional Website',
    summary: 'A complete multi-page website.',
    deliveryTier: 'professional',
    scope: ['Small business websites'],
    priceMode: 'from',
    priceAmountPaise: 799_900,
    currency: 'INR',
  },
];

/**
 * The endpoints every page needs: the service catalogue (sample data), and "who is signed in"
 * (nobody). Tests add or replace routes on top of these.
 */
/** The Portfolio template's listing, as GET /api/v1/templates returns it. */
export const sampleTemplate: TemplateEntry = {
  key: 'portfolio',
  name: 'Portfolio',
  tagline: 'A one-page portfolio for designers, developers and creative professionals.',
  description:
    'Introduce yourself, show your best work and let people get in touch, all on one page.',
  categories: [{ key: 'personal-portfolio', title: 'Personal Portfolio Websites' }],
  features: [
    'Hero with your photo',
    'Skills as chips or bars',
    'Projects grid',
    'Contact form',
    'Social links',
  ],
  featured: true,
  previewImage: {
    src: '/demo/portfolio/preview.webp',
    alt: 'The Portfolio demo on a computer screen',
  },
  demoPath: '/demo/portfolio',
};

export function catalogueRoutes(): Record<string, Handler> {
  return {
    'GET /api/v1/templates': () => jsonResponse(200, { items: [sampleTemplate] }),
    'GET /api/v1/categories': () => jsonResponse(200, { items: sampleCategories }),
    'GET /api/v1/packages': () => jsonResponse(200, { items: samplePackages }),
    'GET /api/v1/auth/me': () => jsonResponse(200, { user: null }),
  };
}

/** The addresses the page has asked for so far, as plain text. */
export function requestedUrls(fetchMock: ReturnType<typeof mockApi>): string[] {
  return fetchMock.mock.calls.map(([input]) => {
    if (typeof input === 'string') return input;
    return input instanceof URL ? input.href : input.url;
  });
}

/** The JSON a page sent in a request, for tests to inspect. */
export function jsonBody(init: RequestInit | undefined): unknown {
  return typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
}

export const sampleCustomer = {
  id: 'user-1',
  email: 'asha@example.com',
  name: 'Asha Rao',
  phone: '+91 98866 07720',
  role: 'customer' as const,
};

export const sampleAdmin = {
  id: 'admin-1',
  email: 'boss@example.com',
  name: 'Prajzo Admin',
  phone: null,
  role: 'admin' as const,
};

/** Makes `GET /auth/me` report this person as signed in. */
export function signedInAs(
  user: typeof sampleCustomer | typeof sampleAdmin,
): Record<string, Handler> {
  return { 'GET /api/v1/auth/me': () => jsonResponse(200, { user }) };
}

/** A project as it appears in a list. */
export function sampleProjectSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    reference: 'PRZ-2026-0001',
    title: 'Website for my studio',
    status: 'received',
    categoryTitle: 'Business Websites',
    createdAt: '2026-10-23T13:30:00.000Z',
    updatedAt: '2026-10-23T13:30:00.000Z',
    ...overrides,
  };
}

/** A whole project, as its owner sees it. */
export function sampleProject(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    ...sampleProjectSummary(),
    categoryKey: 'business-websites',
    packageKey: 'professional-website',
    packageName: 'Professional Website',
    description: 'A simple five-page website for my photography studio, with a gallery.',
    features: ['gallery', 'contact-form'],
    integrations: ['google-maps'],
    preferredDate: '2026-12-01',
    contactPreference: 'whatsapp',
    phone: '+91 98866 07720',
    notes: 'Please message after 5 pm.',
    timeline: [
      {
        kind: 'status',
        from: null,
        to: 'received',
        by: 'customer',
        note: null,
        at: '2026-10-23T13:30:00.000Z',
      },
    ],
    quote: null,
    confirmedDeliveryDate: null,
    revisions: null,
    allowedActions: ['cancel'],
    ...overrides,
  };
}

/** A quote waiting for the customer's answer. */
export function sampleQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    version: 1,
    amountPaise: 1_500_000,
    scope: 'A five-page website with a photo gallery and a contact form, ready to publish.',
    revisionsIncluded: 2,
    sentAt: '2026-10-24T04:30:00.000Z',
    accepted: false,
    ...overrides,
  };
}

/** A page of projects, in the shape the API sends. */
export function projectList(items: ProjectSummary[], total = items.length, page = 1, limit = 10) {
  return { items, page, limit, total };
}

/** The account page asks for the latest three projects; this answers "none yet". */
export const noProjects: Record<string, Handler> = {
  'GET /api/v1/project-requests?limit=3': () => jsonResponse(200, projectList([], 0, 1, 3)),
};

// ---------- What administrators see

/** A project in the admin list. */
export function sampleAdminProjectSummary(
  overrides: Partial<AdminProjectSummary> = {},
): AdminProjectSummary {
  return {
    ...sampleProjectSummary(),
    customerName: 'Asha Rao',
    customerEmail: 'asha@example.com',
    waitingOn: 'prajzo',
    customerReplied: false,
    customerSignedOff: false,
    ...overrides,
  };
}

/** A whole project as an admin sees it: a new request that has not been looked at yet. */
export function sampleAdminProject(
  overrides: Partial<AdminProjectDetail> = {},
): AdminProjectDetail {
  const {
    timeline: _timeline,
    quote: _quote,
    allowedActions: _actions,
    ...shared
  } = sampleProject();
  return {
    ...shared,
    source: 'start-form',
    design: null,
    customer: {
      id: 'user-1',
      name: 'Asha Rao',
      email: 'asha@example.com',
      phone: '+91 98866 07720',
    },
    timeline: [
      {
        kind: 'status',
        from: null,
        to: 'received',
        by: 'customer',
        note: null,
        at: '2026-10-23T13:30:00.000Z',
        actorName: 'Asha Rao',
      },
    ],
    quotes: [],
    adminNotes: [],
    allowedChanges: [
      { to: 'under-review', needs: null },
      { to: 'cancelled', needs: null },
    ],
    waitingOn: 'prajzo',
    customerReplied: false,
    customerSignedOff: false,
    revisionsOverIncluded: false,
    ...overrides,
  };
}

/** A quote an admin sent. */
export function sampleAdminQuote(
  overrides: Partial<AdminProjectDetail['quotes'][number]> = {},
): AdminProjectDetail['quotes'][number] {
  return { ...sampleQuote(), sentByName: 'Prajzo Admin', ...overrides };
}

/** Counts for the overview: four projects, two unread messages, one thing to do. */
export function sampleOverview(overrides: Partial<AdminOverview> = {}): AdminOverview {
  const byStatus = Object.fromEntries(projectStatuses.map((status) => [status, 0])) as Record<
    ProjectStatus,
    number
  >;
  return {
    customers: 3,
    contactMessages: { total: 5, unread: 2 },
    projectRequests: {
      total: 4,
      received: 1,
      byStatus: { ...byStatus, received: 1, 'under-review': 1, 'quote-sent': 2 },
      toDo: { newRequests: 1, replies: 0, accepted: 0, revisions: 0, signedOff: 0 },
    },
    recentActivity: [sampleAuditEntry()],
    ...overrides,
  };
}

/** One line of the activity log. */
export function sampleAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'audit-1',
    at: '2026-10-23T13:30:00.000Z',
    actorName: 'Asha Rao',
    actorRole: 'customer',
    action: 'project.created',
    summary: 'Sent the project "Website for my studio"',
    targetType: 'project',
    targetId: 'PRZ-2026-0001',
    ...overrides,
  };
}

export function sampleAdminCustomer(overrides: Partial<AdminCustomer> = {}): AdminCustomer {
  return {
    id: 'user-1',
    name: 'Asha Rao',
    email: 'asha@example.com',
    phone: '+91 98866 07720',
    status: 'active',
    projectCount: 2,
    createdAt: '2026-10-01T05:00:00.000Z',
    lastLoginAt: '2026-10-23T13:00:00.000Z',
    ...overrides,
  };
}

export function sampleContactMessage(
  overrides: Partial<AdminContactMessage> = {},
): AdminContactMessage {
  return {
    id: 'message-1',
    name: 'Ravi Kumar',
    email: 'ravi@example.com',
    phone: '98866 07720',
    websiteType: 'business-websites',
    websiteTypeTitle: 'Business Websites',
    packageKey: 'professional-website',
    packageName: 'Professional Website',
    message: 'Hello, I would like a website for my sweet shop.\nCan you share the cost?',
    status: 'new',
    createdAt: '2026-10-23T13:30:00.000Z',
    ...overrides,
  };
}

export function sampleAdminCategory(overrides: Partial<AdminCategory> = {}): AdminCategory {
  return { ...sampleCategories[0]!, sortOrder: 10, active: true, ...overrides };
}

export function sampleAdminPackage(overrides: Partial<AdminPackage> = {}): AdminPackage {
  return { ...samplePackages[1]!, sortOrder: 20, active: true, ...overrides };
}

/** Any list the API sends in pages. */
export function pageOf<T>(items: T[], total = items.length, page = 1, limit = 20) {
  return { items, page, limit, total };
}
