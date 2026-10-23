import type { Category, ProjectDetail, ProjectSummary, ServicePackage } from '@prajzo/shared';
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
export function catalogueRoutes(): Record<string, Handler> {
  return {
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
    history: [
      { from: null, to: 'received', by: 'customer', note: null, at: '2026-10-23T13:30:00.000Z' },
    ],
    allowedActions: ['cancel'],
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
