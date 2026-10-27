import { Outlet, ScrollRestoration } from 'react-router';
import { FocusOnNavigation } from '../components/layout/FocusOnNavigation';
import { NavigationProgress } from '../components/layout/NavigationProgress';
import { SiteFooter } from '../components/layout/SiteFooter';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SkipLink } from '../components/layout/SkipLink';
import { WhatsAppButton } from '../components/layout/WhatsAppButton';
import { useAuth } from '../features/auth/auth-context';

export function RootLayout() {
  const { status, user, signOut } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col">
      <NavigationProgress />
      <FocusOnNavigation />
      <SkipLink />
      <SiteHeader account={{ status, user, onSignOut: signOut }} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <WhatsAppButton />
      <ScrollRestoration />
    </div>
  );
}
