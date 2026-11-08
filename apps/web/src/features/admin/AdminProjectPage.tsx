import {
  adminProjectResponseSchema,
  projectStatusInfo,
  type AdminProjectDetail,
  type ProjectStatus,
} from '@prajzo/shared';
import { ArrowLeft, FolderSearch, Mail, MessageCircle, Phone } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert, type AlertTone } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { callLink, emailLinkTo, whatsappLinkTo } from '../../lib/contact-links';
import { formatDate, formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import { RequestDetails } from '../projects/RequestDetails';
import { SubmittedDesign } from './SubmittedDesign';
import { StatusBadge } from '../projects/StatusBadge';
import { Timeline } from '../projects/Timeline';
import type { Notice } from '../projects/use-project-action';
import { DeliveryDatePanel } from './DeliveryDatePanel';
import { InternalNotes } from './InternalNotes';
import { QuotesList } from './QuotesList';
import { StatusChangePanel } from './StatusChangePanel';

/** One project, as an admin sees it: the request, the customer, the quotes, and what to do next. */
export function AdminProjectPage() {
  const { reference = '' } = useParams();
  // A different reference starts again from scratch, so nothing from the last project lingers.
  return <AdminProjectView key={reference} reference={reference} />;
}

function AdminProjectView({ reference }: { reference: string }) {
  const loaded = useApi(
    `/v1/admin/project-requests/${encodeURIComponent(reference)}`,
    adminProjectResponseSchema,
  );
  // The project after the admin did something, so the page shows the new state at once.
  const [changed, setChanged] = useState<AdminProjectDetail | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // `previous` keeps the project on the screen while it is loaded again after a refused move, so
  // the notice saying why nothing changed is not replaced by a spinner.
  const project = changed ?? loaded.data?.project ?? loaded.previous?.project ?? null;
  usePageTitle(project ? `${project.reference} · ${project.title}` : 'Project');

  const { retry } = loaded;
  const onDone = useCallback((updated: AdminProjectDetail, done: Notice | null) => {
    setChanged(updated);
    setNotice(done);
  }, []);
  // Someone moved the project on while this page was open: load it again and say why nothing changed.
  const onOutOfDate = useCallback(
    (message: string) => {
      setChanged(null);
      setNotice({ tone: 'warning', title: 'The project has changed', text: message });
      retry();
    },
    [retry],
  );

  // Only when there is nothing to show yet: a reload that already has the project keeps it, and
  // the notice with it.
  if (loaded.status === 'loading' && !project) {
    return (
      <Container className="py-16">
        <LoadingBlock label="Loading the project" />
      </Container>
    );
  }
  if (loaded.status === 'error') {
    if (loaded.error.status === 404) {
      return (
        <Container className="py-16 sm:py-24">
          <EmptyState
            icon={FolderSearch}
            title="We couldn't find that project"
            headingLevel={1}
            description="Check the reference number, or look for it in the list."
            action={<ButtonLink to="/admin/projects">See all projects</ButtonLink>}
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
  if (!project) return null;

  return (
    <ProjectView project={project} notice={notice} onDone={onDone} onOutOfDate={onOutOfDate} />
  );
}

type Standing = { tone: AlertTone; title: string; text: string };

/** Who has to act next on this project, and what that usually means, in an admin's words. */
function standingOf(project: AdminProjectDetail): Standing {
  const { status } = project;
  if (status === 'completed') {
    return { tone: 'success', title: 'Completed', text: 'This project is finished.' };
  }
  if (status === 'cancelled') {
    return { tone: 'info', title: 'Cancelled', text: 'No further work will be done on it.' };
  }
  if (project.customerReplied) {
    return {
      tone: 'warning',
      title: 'The customer answered your question',
      text: 'Read the answer below, then move the project on.',
    };
  }
  if (project.customerSignedOff) {
    return {
      tone: 'warning',
      title: 'The customer said it looks good',
      text: "Complete the project when you're ready.",
    };
  }
  const waiting: Partial<Record<ProjectStatus, Standing>> = {
    received: {
      tone: 'warning',
      title: 'A new request',
      text: 'Read it, then start the review.',
    },
    'under-review': {
      tone: 'warning',
      title: 'Waiting for you',
      text: 'Send a quote, or ask the customer for what you need.',
    },
    approved: {
      tone: 'warning',
      title: 'The customer accepted the quote',
      text: 'Confirm a delivery date and start development.',
    },
    'in-development': {
      tone: 'info',
      title: 'In development',
      text: 'Move it to testing when it is ready.',
    },
    testing: {
      tone: 'info',
      title: 'In testing',
      text: 'Send it to the customer for review when it is ready.',
    },
    'revision-requested': {
      tone: 'warning',
      title: 'The customer asked for changes',
      text: 'Read what they asked for in the timeline, make the changes, then send it back for review.',
    },
    'awaiting-information': {
      tone: 'info',
      title: "Waiting for the customer's answer",
      text: 'Nothing to do until they reply.',
    },
    'quote-sent': {
      tone: 'info',
      title: 'Waiting for the customer',
      text: 'They can accept or decline the quote. Nothing starts until they accept.',
    },
    'awaiting-review': {
      tone: 'info',
      title: 'Waiting for the customer',
      text: 'They are reviewing the finished project.',
    },
  };
  return (
    waiting[status] ?? {
      tone: 'info',
      title: project.waitingOn === 'customer' ? 'Waiting for the customer' : 'Waiting for you',
      text: '',
    }
  );
}

function ProjectView({
  project,
  notice,
  onDone,
  onOutOfDate,
}: {
  project: AdminProjectDetail;
  notice: Notice | null;
  onDone: (project: AdminProjectDetail, notice: Notice | null) => void;
  onOutOfDate: (message: string) => void;
}) {
  const noticeRef = useRef<HTMLDivElement>(null);

  // After something is done, the button that did it may be gone; move focus to the confirmation so
  // keyboard and screen-reader users aren't left with nothing selected.
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const standing = standingOf(project);
  const lastReply = project.customerReplied
    ? project.timeline.filter((entry) => entry.kind === 'reply').at(-1)
    : undefined;
  const revisions = project.revisions;

  return (
    <Container className="py-8 sm:py-12">
      <Link
        to="/admin/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-indigo underline underline-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All projects
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-sm text-slate-600">{project.reference}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{project.title}</h1>
          <p className="mt-2 text-slate-600">
            {project.categoryTitle} · sent {formatDate(project.createdAt)} by{' '}
            {project.customer.name}
            {project.source === 'builder' ? ' · from the website builder' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          {project.waitingOn === 'prajzo' && <Badge tone="warning">Needs you</Badge>}
          {project.waitingOn === 'customer' && <Badge>Waiting for customer</Badge>}
          {project.customerReplied && <Badge tone="brand">Customer replied</Badge>}
          {project.customerSignedOff && <Badge tone="success">Said it looks good</Badge>}
          {project.revisionsOverIncluded && <Badge tone="danger">Over the included changes</Badge>}
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-10">
          {notice && (
            <div ref={noticeRef} tabIndex={-1} className="outline-none">
              <Alert tone={notice.tone ?? 'success'} title={notice.title}>
                {notice.text}
              </Alert>
            </div>
          )}

          <section aria-labelledby="standing-heading">
            <h2 id="standing-heading" className="text-xl font-semibold tracking-tight">
              Where things stand
            </h2>
            <Alert tone={standing.tone} title={standing.title} className="mt-4">
              {standing.text}
              {lastReply?.kind === 'reply' && (
                <span className="mt-2 block whitespace-pre-line rounded-lg bg-white/70 p-3 text-slate-900">
                  &ldquo;{lastReply.text}&rdquo;
                  <span className="mt-1 block text-xs text-slate-600">
                    {formatDateTime(lastReply.at)}
                  </span>
                </span>
              )}
            </Alert>
          </section>

          <section aria-labelledby="request-heading">
            <h2 id="request-heading" className="text-xl font-semibold tracking-tight">
              The request
            </h2>
            <RequestDetails project={project} audience="admin" />
          </section>

          {project.design ? (
            <section aria-labelledby="design-heading">
              <h2 id="design-heading" className="text-xl font-semibold tracking-tight">
                The design they built
              </h2>
              <SubmittedDesign design={project.design} />
            </section>
          ) : null}

          {/* Keyed by status, so a move starts the panel afresh: nothing typed carries over. */}
          <StatusChangePanel
            key={project.status}
            project={project}
            onDone={onDone}
            onOutOfDate={onOutOfDate}
          />
          <QuotesList quotes={project.quotes} />
          <DeliveryDatePanel
            key={project.confirmedDeliveryDate ?? 'none'}
            project={project}
            onDone={onDone}
            onOutOfDate={onOutOfDate}
          />
          <InternalNotes project={project} onDone={onDone} onOutOfDate={onOutOfDate} />
        </div>

        <aside className="grid content-start gap-10">
          <section aria-labelledby="customer-heading">
            <h2 id="customer-heading" className="text-xl font-semibold tracking-tight">
              Customer
            </h2>
            <Card className="mt-4 grid gap-3">
              <p className="text-lg font-semibold text-ink">{project.customer.name}</p>
              <ContactLinks project={project} />
              <Link
                to={`/admin/customers/${project.customer.id}`}
                className="text-sm font-medium text-brand-indigo underline underline-offset-2"
              >
                All of this customer&apos;s projects
              </Link>
            </Card>
          </section>

          {revisions && (
            <section aria-labelledby="revisions-heading">
              <h2 id="revisions-heading" className="text-xl font-semibold tracking-tight">
                Rounds of changes
              </h2>
              <Card className="mt-4 grid gap-3">
                <p className="text-slate-700">
                  <strong className="text-ink">
                    {revisions.used} of {revisions.included}
                  </strong>{' '}
                  rounds of changes in the accepted quote have been asked for.
                </p>
                {project.revisionsOverIncluded && (
                  <Alert tone="warning" title="More than the quote includes">
                    The customer has asked for more rounds of changes than their quote covers. Extra
                    changes may need a separate quote.
                  </Alert>
                )}
              </Card>
            </section>
          )}

          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-xl font-semibold tracking-tight">
              Timeline
            </h2>
            <Timeline entries={project.timeline} audience="admin" />
          </section>
          <p className="text-sm text-slate-600">
            Status: {projectStatusInfo[project.status].label}. Last updated{' '}
            <time dateTime={project.updatedAt}>{formatDateTime(project.updatedAt)}</time>.
          </p>
        </aside>
      </div>
    </Container>
  );
}

/** Ways to reach the customer from the page: email, a call, WhatsApp. */
function ContactLinks({ project }: { project: AdminProjectDetail }) {
  const { email, phone } = project.customer;
  const subject = `${project.reference}: ${project.title}`;
  const call = phone ? callLink(phone) : null;
  const whatsapp = phone
    ? whatsappLinkTo(phone, `Hi ${project.customer.name}, about ${subject}`)
    : null;
  return (
    <ul className="grid gap-2 text-sm">
      <Line icon={<Mail aria-hidden="true" className="size-4" />}>
        <a href={emailLinkTo(email, subject)} className="break-all underline underline-offset-2">
          {email}
        </a>
      </Line>
      {phone && (
        <Line icon={<Phone aria-hidden="true" className="size-4" />}>
          {call ? (
            <a href={call} className="underline underline-offset-2">
              {phone}
            </a>
          ) : (
            phone
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
