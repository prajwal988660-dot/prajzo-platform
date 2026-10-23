export type NavItem = {
  label: string;
  to: string;
  /** False until the page it opens works. Links to unbuilt pages are never shown (docs/DECISIONS.md D-016). */
  available: boolean;
};

/** Main navigation, in the order the brief asks for. Pages switch on as their phase is completed. */
export const primaryNavigation: NavItem[] = [
  { label: 'Home', to: '/', available: true },
  { label: 'Services', to: '/services', available: true },
  { label: 'Templates', to: '/templates', available: false }, // template phases
  { label: 'How It Works', to: '/how-it-works', available: true },
  { label: 'Pricing', to: '/pricing', available: true },
  { label: 'Projects', to: '/projects', available: false }, // template phases
  { label: 'Contact', to: '/contact', available: true },
];

/**
 * The header's "Start a Project" button. Until the dedicated Start a Project page exists
 * (Phase 4), it opens the contact form, which is how projects start today.
 */
export const headerCallToAction: NavItem = {
  label: 'Start a Project',
  to: '/contact',
  available: true,
};

/** Legal pages, linked from the footer. */
export const footerLegalLinks: NavItem[] = [
  { label: 'Privacy Policy', to: '/privacy', available: true },
  { label: 'Terms and Conditions', to: '/terms', available: true },
];

export const visibleNavigation = primaryNavigation.filter((item) => item.available);
