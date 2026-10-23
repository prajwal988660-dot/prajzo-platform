import { siteContact, siteLinks } from '@prajzo/shared';
import { Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { InstagramIcon } from '../../../components/ui/BrandIcons';
import { cx } from '../../../lib/cx';

type Option = {
  label: string;
  value: string;
  href: string;
  external: boolean;
  icon: LucideIcon | typeof InstagramIcon;
};

const options: Option[] = [
  { label: 'Email', value: siteContact.email, href: siteLinks.email, external: false, icon: Mail },
  {
    label: 'Phone',
    value: siteContact.phoneDisplay,
    href: siteLinks.phone,
    external: false,
    icon: Phone,
  },
  {
    label: 'WhatsApp',
    value: siteContact.phoneDisplay,
    href: siteLinks.whatsapp("Hi Prajzo! I'd like to talk about a website."),
    external: true,
    icon: MessageCircle,
  },
  {
    label: 'Instagram',
    value: `@${siteContact.instagramHandle}`,
    href: siteLinks.instagram,
    external: true,
    icon: InstagramIcon,
  },
];

/** Ways to reach Prajzo directly. */
export function ContactOptions({ className }: { className?: string }) {
  return (
    <ul className={cx('grid gap-3', className)}>
      {options.map(({ label, value, href, external, icon: Icon }) => (
        <li key={label}>
          <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition hover:border-brand-indigo/30 focus-visible:outline-2 focus-visible:outline-brand-blue"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-brand-indigo">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-600">{label}</span>
              <span className="block truncate font-semibold text-ink">{value}</span>
            </span>
            {external && <span className="sr-only">(opens in a new tab)</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
