import type { Category, ServicePackage } from '@prajzo/shared';
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

/** The catalogue endpoints, answering with the sample data. */
export function catalogueRoutes(): Record<string, Handler> {
  return {
    'GET /api/v1/categories': () => jsonResponse(200, { items: sampleCategories }),
    'GET /api/v1/packages': () => jsonResponse(200, { items: samplePackages }),
  };
}
