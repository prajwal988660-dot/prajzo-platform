import { siteContact, siteLinks } from '@prajzo/shared';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { footerLegalLinks, primaryNavigation, type NavItem } from '../../app/navigation';
import { InstagramIcon } from '../ui/BrandIcons';
import { Container } from './Container';
import { Logo } from './Logo';

const exploreLinks = primaryNavigation.filter((item) => item.available && item.to !== '/contact');
const companyLinks: NavItem[] = [
  { label: 'About Us', to: '/about', available: true },
  { label: 'Contact', to: '/contact', available: true },
  ...footerLegalLinks,
];

const linkClass =
  'rounded text-slate-600 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-blue';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-surface">
      <div aria-hidden="true" className="h-0.5 bg-brand-gradient opacity-60" />
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Websites, web applications and digital solutions, designed and built by Prajzo.
          </p>
          <ul className="mt-6 grid gap-2.5 text-sm">
            <FooterContact icon={<Mail className="size-4" />} href={siteLinks.email}>
              {siteContact.email}
            </FooterContact>
            <FooterContact icon={<Phone className="size-4" />} href={siteLinks.phone}>
              {siteContact.phoneDisplay}
            </FooterContact>
            <FooterContact
              icon={<MessageCircle className="size-4" />}
              href={siteLinks.whatsapp()}
              external
            >
              WhatsApp
            </FooterContact>
            <FooterContact
              icon={<InstagramIcon className="size-4" />}
              href={siteLinks.instagram}
              external
            >
              @{siteContact.instagramHandle}
            </FooterContact>
          </ul>
        </div>

        <FooterLinks title="Explore" links={exploreLinks} />
        <FooterLinks title="Company" links={companyLinks} />
      </Container>
      <div className="border-t border-slate-200">
        <Container className="py-5">
          <p className="text-sm text-slate-600">© {year} Prajzo. All rights reserved.</p>
        </Container>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: NavItem[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-4 grid gap-2.5 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterContact({
  icon,
  href,
  external = false,
  children,
}: {
  icon: ReactNode;
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={`inline-flex items-center gap-2.5 ${linkClass}`}
      >
        <span aria-hidden="true" className="text-brand-indigo">
          {icon}
        </span>
        {children}
        {external && <span className="sr-only">(opens in a new tab)</span>}
      </a>
    </li>
  );
}
