export type NavItem = {
  label: string;
  to: string;
  /** False until the page it opens works. Links to unbuilt pages are never shown (docs/DECISIONS.md D-016). */
  available: boolean;
};

/** Main navigation, in the order the brief asks for. Pages switch on as their phase is completed. */
export const primaryNavigation: NavItem[] = [
  { label: 'Home', to: '/', available: true },
  { label: 'Services', to: '/services', available: false }, // Phase 2
  { label: 'Templates', to: '/templates', available: false }, // Phase 4
  { label: 'How It Works', to: '/how-it-works', available: false }, // Phase 2
  { label: 'Pricing', to: '/pricing', available: false }, // Phase 2
  { label: 'Projects', to: '/projects', available: false }, // Phase 4
  { label: 'Contact', to: '/contact', available: false }, // Phase 2
];

/** The "Start a Project" button in the header (Phase 10). */
export const headerCallToAction: NavItem = {
  label: 'Start a Project',
  to: '/start',
  available: false,
};

export const visibleNavigation = primaryNavigation.filter((item) => item.available);
