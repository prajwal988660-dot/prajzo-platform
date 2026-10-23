import type { RouteObject } from 'react-router';
import { AdminLayout } from '../features/admin/AdminLayout';
import { GuestOnly, RequireAdmin, RequireCustomer } from '../features/auth/guards';
import { HomePage } from '../features/marketing/HomePage';
import { NotFoundPage } from '../features/system/NotFoundPage';
import { AuthRoot } from './AuthRoot';
import { RootLayout } from './RootLayout';
import { RouteErrorPage } from './RouteErrorPage';
import { StartupScreen } from './StartupScreen';

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
  {
    path: 'start-project',
    lazy: async () => ({
      Component: (await import('../features/projects/StartProjectPage')).StartProjectPage,
    }),
  },
  {
    path: 'reset-password',
    lazy: async () => ({
      Component: (await import('../features/auth/ResetPasswordPage')).ResetPasswordPage,
    }),
  },
];

/** Sign in, sign up and "forgot password": only for people who are not signed in. */
const guestPages: RouteObject = {
  element: <GuestOnly />,
  children: [
    {
      path: 'login',
      lazy: async () => ({ Component: (await import('../features/auth/LoginPage')).LoginPage }),
    },
    {
      path: 'register',
      lazy: async () => ({
        Component: (await import('../features/auth/RegisterPage')).RegisterPage,
      }),
    },
    {
      path: 'forgot-password',
      lazy: async () => ({
        Component: (await import('../features/auth/ForgotPasswordPage')).ForgotPasswordPage,
      }),
    },
  ],
};

/** Pages for signed-in customers. */
const customerPages: RouteObject = {
  element: <RequireCustomer />,
  children: [
    {
      path: 'account',
      lazy: async () => ({
        Component: (await import('../features/account/AccountPage')).AccountPage,
      }),
    },
    {
      path: 'account/projects',
      lazy: async () => ({
        Component: (await import('../features/projects/MyProjectsPage')).MyProjectsPage,
      }),
    },
    {
      path: 'account/projects/:reference',
      lazy: async () => ({
        Component: (await import('../features/projects/ProjectDetailPage')).ProjectDetailPage,
      }),
    },
  ],
};

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
    element: <AuthRoot />,
    HydrateFallback: StartupScreen,
    errorElement: <RouteErrorPage />,
    children: [
      {
        // The public website: marketing header and footer.
        element: <RootLayout />,
        errorElement: <RouteErrorPage />,
        children: [
          {
            // Errors inside a page are shown inside the normal header and footer.
            errorElement: <RouteErrorPage />,
            children: [
              { index: true, element: <HomePage /> },
              ...lazyPages,
              guestPages,
              customerPages,
              ...developmentRoutes,
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
      {
        // The administration area: its own plain frame.
        path: 'admin',
        element: <AdminLayout />,
        errorElement: <RouteErrorPage />,
        children: [
          {
            path: 'login',
            lazy: async () => ({
              Component: (await import('../features/auth/AdminLoginPage')).AdminLoginPage,
            }),
          },
          {
            element: <RequireAdmin />,
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('../features/admin/AdminDashboardPage'))
                    .AdminDashboardPage,
                }),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
