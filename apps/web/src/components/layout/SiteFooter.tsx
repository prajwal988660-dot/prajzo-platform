import { Link } from 'react-router';
import { visibleNavigation, type NavItem } from '../../app/navigation';
import { Container } from './Container';
import { Logo } from './Logo';

export function SiteFooter({ items = visibleNavigation }: { items?: NavItem[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-surface">
      <div aria-hidden="true" className="h-0.5 bg-brand-gradient opacity-60" />
      <Container className="grid gap-8 py-12 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Websites, web applications and digital solutions, designed and built by Prajzo.
          </p>
        </div>

        {items.length > 1 && (
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              {items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="rounded text-slate-600 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-blue"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </Container>
      <div className="border-t border-slate-200">
        <Container className="py-5">
          <p className="text-sm text-slate-600">© {year} Prajzo. All rights reserved.</p>
        </Container>
      </div>
    </footer>
  );
}
