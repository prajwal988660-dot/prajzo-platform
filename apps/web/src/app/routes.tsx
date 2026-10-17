import type { RouteObject } from 'react-router';
import { HomePage } from '../features/marketing/HomePage';
import { NotFoundPage } from '../features/system/NotFoundPage';
import { RootLayout } from './RootLayout';
import { RouteErrorPage } from './RouteErrorPage';

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
          ...developmentRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
