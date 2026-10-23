import type { RouteObject } from 'react-router';
import { HomePage } from '../features/marketing/HomePage';
import { NotFoundPage } from '../features/system/NotFoundPage';
import { RootLayout } from './RootLayout';
import { RouteErrorPage } from './RouteErrorPage';

/**
 * Pages other than Home are loaded only when they are opened, so the first visit downloads
 * less code (important on mobile data).
 */
const lazyPages: RouteObject[] = [
  {
    path: 'services',
    lazy: async () => ({
      Component: (await import('../features/marketing/ServicesPage')).ServicesPage,
    }),
  },
  {
    path: 'how-it-works',
    lazy: async () => ({
      Component: (await import('../features/marketing/HowItWorksPage')).HowItWorksPage,
    }),
  },
  {
    path: 'pricing',
    lazy: async () => ({
      Component: (await import('../features/marketing/PricingPage')).PricingPage,
    }),
  },
  {
    path: 'about',
    lazy: async () => ({ Component: (await import('../features/marketing/AboutPage')).AboutPage }),
  },
  {
    path: 'contact',
    lazy: async () => ({
      Component: (await import('../features/marketing/ContactPage')).ContactPage,
    }),
  },
  {
    path: 'privacy',
    lazy: async () => ({ Component: (await import('../features/legal/PrivacyPage')).PrivacyPage }),
  },
  {
    path: 'terms',
    lazy: async () => ({ Component: (await import('../features/legal/TermsPage')).TermsPage }),
  },
];

/** Development-only pages; they are left out of production builds entirely. */
const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'dev/ui',
        lazy: async () => ({
          Component: (await import('../features/dev/UiGalleryPage')).UiGalleryPage,
        }),
      },
    ]
  : [];

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        // Errors inside a page are shown inside the normal header and footer.
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <HomePage /> },
          ...lazyPages,
          ...developmentRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
