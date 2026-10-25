import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Logo } from '../../components/layout/Logo';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { submitErrorMessage } from '../../lib/form-errors';
import { useNoIndex } from '../../lib/use-no-index';
import { useAuth } from '../auth/auth-context';

const sections = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/projects', label: 'Projects', end: false },
  { to: '/admin/customers', label: 'Customers', end: false },
  { to: '/admin/messages', label: 'Messages', end: false },
  { to: '/admin/catalogue', label: 'Catalogue', end: false },
  { to: '/admin/activity', label: 'Activity', end: false },
];

/** A plain frame for the administration area: no marketing header, footer or chat button. */
export function AdminLayout() {
  useNoIndex();
  const { user, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    setBusy(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(submitErrorMessage(error, "We couldn't sign you out. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <Container className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge tone="brand">Admin</Badge>
          </div>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <Link to="/" className="font-medium text-slate-700 hover:text-ink">
                View website
              </Link>
              <span className="hidden text-slate-600 md:inline">{user.email}</span>
              <Button variant="secondary" size="sm" loading={busy} onClick={() => void leave()}>
                <LogOut aria-hidden="true" className="size-4" />
                Sign out
              </Button>
            </div>
          )}
        </Container>
        {user && (
          <nav aria-label="Administration" className="border-t border-slate-100">
            <Container>
              <ul className="-mx-1 flex gap-1 overflow-x-auto py-2 text-sm font-medium">
                {sections.map((section) => (
                  <li key={section.to}>
                    <NavLink
                      to={section.to}
                      end={section.end}
                      className={({ isActive }) =>
                        `block whitespace-nowrap rounded-full px-4 py-2 transition ${
                          isActive
                            ? 'bg-ink text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-ink'
                        }`
                      }
                    >
                      {section.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </Container>
          </nav>
        )}
        {signOutError && (
          <Container className="pb-3">
            <Alert tone="error" title="Still signed in">
              {signOutError}
            </Alert>
          </Container>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
    </div>
  );
}
