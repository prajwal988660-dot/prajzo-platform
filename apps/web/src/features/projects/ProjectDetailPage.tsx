import {
  contactPreferenceLabels,
  projectFeatureLabels,
  projectIntegrationLabels,
  projectResponseSchema,
  projectStatusInfo,
  type ProjectDetail,
} from '@prajzo/shared';
import { FolderSearch } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { formatCalendarDate, formatDate, formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { useNoIndex } from '../../lib/use-no-index';
import { usePageTitle } from '../../lib/use-page-title';
import { ContactOptions } from '../marketing/components/ContactOptions';
import { PageIntro } from '../marketing/components/PageIntro';
import { CancelProject } from './CancelProject';
import { StatusBadge } from './StatusBadge';

/** One of the customer's projects: what they asked for, where it stands, and its timeline. */
export function ProjectDetailPage() {
  const { reference = '' } = useParams();
  // A different reference starts again from scratch, so nothing from the last project lingers.
  return <ProjectDetailView key={reference} reference={reference} />;
}

function ProjectDetailView({ reference }: { reference: string }) {
  useNoIndex();
  const loaded = useApi(
    `/v1/project-requests/${encodeURIComponent(reference)}`,
    projectResponseSchema,
  );
  // The project after the customer cancelled it, so the page shows the new state at once.
  const [changed, setChanged] = useState<ProjectDetail | null>(null);
  const project = changed ?? loaded.data?.project ?? null;
  usePageTitle(project?.title ?? 'Project');

  if (loaded.status === 'loading') {
    return (
      <Container className="py-16">
        <LoadingBlock label="Loading your project" />
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
            description="Check the reference number, or look for it in your list. Projects are only visible to the account that sent them."
            action={<ButtonLink to="/account/projects">See my projects</ButtonLink>}
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
    <ProjectView
      project={project}
      onCancelled={setChanged}
      onOutOfDate={loaded.retry}
      justCancelled={changed !== null}
    />
  );
}

function ProjectView({
  project,
  onCancelled,
  onOutOfDate,
  justCancelled,
}: {
  project: ProjectDetail;
  onCancelled: (project: ProjectDetail) => void;
  onOutOfDate: () => void;
  justCancelled: boolean;
}) {
  const info = projectStatusInfo[project.status];
  const noticeRef = useRef<HTMLDivElement>(null);

  // After cancelling, the cancel button is gone; move focus to the confirmation so keyboard and
  // screen-reader users aren't left with nothing selected.
  useEffect(() => {
    if (justCancelled) noticeRef.current?.focus();
  }, [justCancelled]);

  return (
    <>
      <PageIntro eyebrow={`Project ${project.reference}`} title={project.title}>
        <div className="flex flex-wrap items-center gap-3 text-base">
          <StatusBadge status={project.status} />
          <span className="text-sm text-slate-600">Sent {formatDate(project.createdAt)}</span>
        </div>
      </PageIntro>

      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-10">
          {justCancelled && (
            <div ref={noticeRef} tabIndex={-1} className="outline-none">
              <Alert tone="success" title="Your project has been cancelled">
                No further work will be done on it. You&apos;re welcome to start a new project at
                any time.
              </Alert>
            </div>
          )}

          <section aria-labelledby="status-heading">
            <h2 id="status-heading" className="text-xl font-semibold tracking-tight">
              Where things stand
            </h2>
            <Card className="mt-4 grid gap-3">
              <p className="text-lg font-semibold text-ink">{info.meaning}</p>
              <p className="text-slate-600">
                <span className="font-medium text-ink">What happens next: </span>
                {info.next}
              </p>
            </Card>
          </section>

          <section aria-labelledby="request-heading">
            <h2 id="request-heading" className="text-xl font-semibold tracking-tight">
              Your request
            </h2>
            <RequestDetails project={project} />
          </section>

          {project.allowedActions.includes('cancel') && (
            <CancelProject
              reference={project.reference}
              onCancelled={onCancelled}
              onOutOfDate={onOutOfDate}
            />
          )}
        </div>

        <aside className="grid content-start gap-10">
          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-xl font-semibold tracking-tight">
              Timeline
            </h2>
            <Timeline project={project} />
          </section>
          <section aria-labelledby="help-heading">
            <h2 id="help-heading" className="text-xl font-semibold tracking-tight">
              Questions about this project?
            </h2>
            <p className="mt-2 text-slate-600">
              Quote <span className="font-mono text-ink">{project.reference}</span> when you get in
              touch.
            </p>
            <ContactOptions className="mt-4" />
          </section>
        </aside>
      </Container>
    </>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-slate-600">{term}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function RequestDetails({ project }: { project: ProjectDetail }) {
  const features = project.features.map((feature) => projectFeatureLabels[feature]);
  const integrations = project.integrations.map(
    (integration) => projectIntegrationLabels[integration],
  );
  return (
    <dl className="mt-2">
      <Detail term="Type of website">{project.categoryTitle}</Detail>
      <Detail term="Package">{project.packageName ?? 'Not chosen yet'}</Detail>
      <Detail term="About the project">
        <span className="whitespace-pre-line">{project.description}</span>
      </Detail>
      <Detail term="Features">{features.length > 0 ? features.join(', ') : 'None chosen'}</Detail>
      <Detail term="Services to connect">
        {integrations.length > 0 ? integrations.join(', ') : 'None chosen'}
      </Detail>
      <Detail term="Preferred date">
        {project.preferredDate ? (
          <>
            {formatCalendarDate(project.preferredDate)}{' '}
            <span className="text-sm text-slate-600">(a wish, not a promise)</span>
          </>
        ) : (
          'No date given'
        )}
      </Detail>
      <Detail term="How to contact you">
        {contactPreferenceLabels[project.contactPreference]}
        {project.phone ? ` · ${project.phone}` : ''}
      </Detail>
      {project.notes && (
        <Detail term="Notes">
          <span className="whitespace-pre-line">{project.notes}</span>
        </Detail>
      )}
    </dl>
  );
}

function Timeline({ project }: { project: ProjectDetail }) {
  const last = project.history.length - 1;
  return (
    <ol className="mt-5 grid gap-6 border-l-2 border-slate-200 pl-6">
      {project.history.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="relative">
          <span
            aria-hidden="true"
            className={`absolute -left-[2.1rem] top-1.5 size-3 rounded-full ring-4 ring-white ${
              index === last ? 'bg-brand-indigo' : 'bg-slate-300'
            }`}
          />
          <p className="font-semibold text-ink">{projectStatusInfo[entry.to].label}</p>
          <p className="text-sm text-slate-600">
            {entry.by === 'customer' ? 'You' : 'Prajzo'} ·{' '}
            <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
          </p>
          {entry.note && <p className="mt-1 text-sm text-slate-700">&ldquo;{entry.note}&rdquo;</p>}
        </li>
      ))}
    </ol>
  );
}
