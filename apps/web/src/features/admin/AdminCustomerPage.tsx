import { adminCustomerDetailSchema } from '@prajzo/shared';
import { ArrowLeft, FolderKanban, Mail, MessageCircle, Phone, UserX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { callLink, emailLinkTo, whatsappLinkTo } from '../../lib/contact-links';
import { formatDate, formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import { StatusBadge } from '../projects/StatusBadge';

/** One customer: how to reach them, and every project they have sent. */
export function AdminCustomerPage() {
  const { id = '' } = useParams();
  return <CustomerView key={id} id={id} />;
}

function CustomerView({ id }: { id: string }) {
  const loaded = useApi(`/v1/admin/customers/${encodeURIComponent(id)}`, adminCustomerDetailSchema);
  usePageTitle(loaded.data?.customer.name ?? 'Customer');

  if (loaded.status === 'loading') {
    return (
      <Container className="py-16">
        <LoadingBlock label="Loading the customer" />
      </Container>
    );
  }
  if (loaded.status === 'error') {
    if (loaded.error.status === 404) {
      return (
        <Container className="py-16 sm:py-24">
          <EmptyState
            icon={UserX}
            title="We couldn't find that customer"
            headingLevel={1}
            description="They may have been removed, or the link is wrong."
            action={<ButtonLink to="/admin/customers">See all customers</ButtonLink>}
          />
        </Container>
      );
    }
    return (
      <Container className="py-16">
        <LoadError message={loaded.error.message} onRetry={loaded.retry} />
      </Container>
    );
  }

  const { customer, projects } = loaded.data;
  const call = customer.phone ? callLink(customer.phone) : null;
  const whatsapp = customer.phone ? whatsappLinkTo(customer.phone, `Hi ${customer.name},`) : null;

  return (
    <Container className="py-8 sm:py-12">
      <Link
        to="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-indigo underline underline-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All customers
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{customer.name}</h1>
        {customer.status === 'disabled' && <Badge tone="danger">Account disabled</Badge>}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.5fr]">
        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-xl font-semibold tracking-tight">
            Contact
          </h2>
          <Card className="mt-4 grid gap-3">
            <ul className="grid gap-2 text-sm">
              <Line icon={<Mail aria-hidden="true" className="size-4" />}>
                <a
                  href={emailLinkTo(customer.email)}
                  className="break-all underline underline-offset-2"
                >
                  {customer.email}
                </a>
              </Line>
              {customer.phone && (
                <Line icon={<Phone aria-hidden="true" className="size-4" />}>
                  {call ? (
                    <a href={call} className="underline underline-offset-2">
                      {customer.phone}
                    </a>
                  ) : (
                    customer.phone
                  )}
                </Line>
              )}
              {whatsapp && (
                <Line icon={<MessageCircle aria-hidden="true" className="size-4" />}>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    Message on WhatsApp <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Line>
              )}
            </ul>
            <dl className="mt-2 grid gap-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
              <div className="flex flex-wrap gap-x-2">
                <dt>Joined</dt>
                <dd className="text-ink">{formatDate(customer.createdAt)}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt>Last signed in</dt>
                <dd className="text-ink">
                  {customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : 'Never'}
                </dd>
              </div>
            </dl>
          </Card>
        </section>

        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="text-xl font-semibold tracking-tight">
            Projects
          </h2>
          {projects.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="This customer has not sent a project request."
              />
            </div>
          ) : (
            <ul aria-label="Projects" className="mt-4 grid gap-4">
              {projects.map((project) => (
                <li key={project.reference}>
                  <Link
                    to={`/admin/projects/${project.reference}`}
                    className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                  >
                    <Card
                      interactive
                      className="flex flex-wrap items-center justify-between gap-3 p-5"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-ink">{project.title}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          <span className="font-mono">{project.reference}</span> ·{' '}
                          {project.categoryTitle} · Sent {formatDate(project.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={project.status} />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Container>
  );
}

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-slate-700">
      <span className="mt-0.5 shrink-0 text-slate-500">{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
