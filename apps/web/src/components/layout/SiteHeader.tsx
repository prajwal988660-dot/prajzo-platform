import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { headerCallToAction, visibleNavigation, type NavItem } from '../../app/navigation';
import { cx } from '../../lib/cx';
import { ButtonLink } from '../ui/Button';
import { Container } from './Container';
import { Logo } from './Logo';

type SiteHeaderProps = {
  items?: NavItem[];
  callToAction?: NavItem | null;
};

export function SiteHeader({
  items = visibleNavigation,
  callToAction = headerCallToAction.available ? headerCallToAction : null,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // A lone "Home" link adds nothing next to the logo, so navigation appears once there are two pages.
  const showNavigation = items.length > 1;
  const hasMenu = showNavigation || callToAction !== null;

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
          <div className="flex items-center gap-3">
            {callToAction && (
              <ButtonLink to={callToAction.to} size="sm" className="hidden sm:inline-flex">
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
