import type { PublicUser } from '@prajzo/shared';
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { headerCallToAction, visibleNavigation, type NavItem } from '../../app/navigation';
import { cx } from '../../lib/cx';
import { submitErrorMessage } from '../../lib/form-errors';
import { Alert } from '../ui/Alert';
import { ButtonLink } from '../ui/Button';
import { Container } from './Container';
import { Logo } from './Logo';

/** Who is signed in, for the header. Shown only once the server has said (no flicker). */
export type HeaderAccount = {
  status: 'loading' | 'ready' | 'unavailable';
  user: PublicUser | null;
  onSignOut: () => Promise<void>;
};

type SiteHeaderProps = {
  items?: NavItem[];
  callToAction?: NavItem | null;
  account?: HeaderAccount;
};

const textLink =
  'rounded-full px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-blue';

export function SiteHeader({
  items = visibleNavigation,
  callToAction = headerCallToAction.available ? headerCallToAction : null,
  account,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const navigate = useNavigate();

  // A lone "Home" link adds nothing next to the logo, so navigation appears once there are two pages.
  const showNavigation = items.length > 1;
  const accountReady = account?.status === 'ready';
  const hasMenu = showNavigation || callToAction !== null || accountReady;

  useEffect(() => {
    if (!menuOpen) return;
    menuPanel.current?.querySelector('a')?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const signOut = async () => {
    if (!account) return;
    setSigningOut(true);
    setSignOutError(null);
    setMenuOpen(false);
    // Leave first. If the person were signed out while still on a private page (My account), the
    // page guard would send them to the sign-in page instead of the home page.
    void navigate('/');
    try {
      await account.onSignOut();
    } catch (error) {
      setSignOutError(submitErrorMessage(error, "We couldn't sign you out. Please try again."));
    } finally {
      setSigningOut(false);
    }
  };

  const accountHome = account?.user?.role === 'admin' ? '/admin' : '/account';
  const accountLabel = account?.user?.role === 'admin' ? 'Admin' : 'My account';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />

        {showNavigation && (
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cx(
                        'rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-blue',
                        isActive
                          ? 'bg-slate-100 text-ink'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {hasMenu && (
          <div className="flex items-center gap-1 sm:gap-2">
            {accountReady && !account.user && (
              <Link to="/login" className={cx(textLink, 'hidden sm:inline-flex')}>
                Sign in
              </Link>
            )}
            {accountReady && account.user && (
              <>
                <Link to={accountHome} className={cx(textLink, 'hidden sm:inline-flex')}>
                  {accountLabel}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={signingOut}
                  className={cx(
                    textLink,
                    'hidden cursor-pointer disabled:opacity-60 sm:inline-flex',
                  )}
                >
                  Sign out
                </button>
              </>
            )}
            {callToAction && (
              <ButtonLink to={callToAction.to} size="sm" className="ml-1 hidden sm:inline-flex">
                {callToAction.label}
              </ButtonLink>
            )}
            <button
              ref={menuButton}
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-blue lg:hidden"
              aria-expanded={menuOpen}
              aria-controls={panelId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
              <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        )}
      </Container>

      {signOutError && (
        <Container className="pb-3">
          <Alert tone="error" title="You're still signed in">
            {signOutError}
          </Alert>
        </Container>
      )}

      {hasMenu && menuOpen && (
        <div
          ref={menuPanel}
          id={panelId}
          className="border-t border-slate-200 bg-white shadow-card lg:hidden"
        >
          <Container className="py-4">
            <nav aria-label="Main">
              <ul className="grid gap-1">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        cx(
                          'block rounded-xl px-4 py-3 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-blue',
                          isActive ? 'bg-slate-100 text-ink' : 'text-slate-700 hover:bg-slate-50',
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {accountReady && (
              <nav aria-label="Account" className="mt-3 border-t border-slate-100 pt-3">
                <ul className="grid gap-1">
                  {account.user ? (
                    <>
                      <li>
                        <NavLink
                          to={accountHome}
                          onClick={closeMenu}
                          className="block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-blue"
                        >
                          {accountLabel}
                        </NavLink>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => void signOut()}
                          disabled={signingOut}
                          className="block w-full cursor-pointer rounded-xl px-4 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-blue disabled:opacity-60"
                        >
                          Sign out
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <NavLink
                          to="/login"
                          onClick={closeMenu}
                          className="block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-blue"
                        >
                          Sign in
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/register"
                          onClick={closeMenu}
                          className="block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-blue"
                        >
                          Create an account
                        </NavLink>
                      </li>
                    </>
                  )}
                </ul>
              </nav>
            )}

            {callToAction && (
              <ButtonLink
                to={callToAction.to}
                onClick={closeMenu}
                className="mt-4 w-full sm:hidden"
              >
                {callToAction.label}
              </ButtonLink>
            )}
          </Container>
        </div>
      )}
    </header>
  );
}
