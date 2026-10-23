import { Outlet, ScrollRestoration } from 'react-router';
import { NavigationProgress } from '../components/layout/NavigationProgress';
import { SiteFooter } from '../components/layout/SiteFooter';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SkipLink } from '../components/layout/SkipLink';
import { WhatsAppButton } from '../components/layout/WhatsAppButton';

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <NavigationProgress />
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <WhatsAppButton />
      <ScrollRestoration />
    </div>
  );
}
