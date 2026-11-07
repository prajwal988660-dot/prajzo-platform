import { projectResponseSchema, projectStatusInfo, type ProjectDetail } from '@prajzo/shared';
import { FolderSearch } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { formatCalendarDate, formatDate } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { useNoIndex } from '../../lib/use-no-index';
import { usePageTitle } from '../../lib/use-page-title';
import { ContactOptions } from '../marketing/components/ContactOptions';
import { PageIntro } from '../marketing/components/PageIntro';
import { CancelProject } from './CancelProject';
import { QuoteCard } from './QuoteCard';
import { ReplyToQuestion } from './ReplyToQuestion';
import { RequestDetails } from './RequestDetails';
import { ReviewProject } from './ReviewProject';
import { StatusBadge } from './StatusBadge';
import { Timeline } from './Timeline';
import type { Notice } from './use-project-action';

/** One of the customer's projects: what they asked for, where it stands, and what they can do next. */
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
  // The project after the customer did something, so the page shows the new state at once.
  const [changed, setChanged] = useState<ProjectDetail | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // `previous` keeps the project on the screen while it is loaded again after a refused action, so
  // the notice saying why nothing changed is not replaced by a spinner.
  const project = changed ?? loaded.data?.project ?? loaded.previous?.project ?? null;
  usePageTitle(project?.title ?? 'Project');

  const { retry } = loaded;
  const onDone = useCallback((updated: ProjectDetail, done: Notice) => {
    setChanged(updated);
    setNotice(done);
  }, []);
  // Someone moved the project on while this page was open: forget what we showed, load it again.
  const onOutOfDate = useCallback(
    (message: string) => {
      setChanged(null);
      setNotice({ tone: 'warning', title: 'The project has changed', text: message });
      retry();
    },
    [retry],
  );

  // Only when there is nothing to show yet, so a reload after a refused action keeps the project
  // and the notice explaining it.
  if (loaded.status === 'loading' && !project) {
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
            headingLevel={1}
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
    <ProjectView project={project} notice={notice} onDone={onDone} onOutOfDate={onOutOfDate} />
  );
}

function ProjectView({
  project,
  notice,
  onDone,
  onOutOfDate,
}: {
  project: ProjectDetail;
  notice: Notice | null;
  onDone: (project: ProjectDetail, notice: Notice) => void;
  onOutOfDate: (message: string) => void;
}) {
  const info = projectStatusInfo[project.status];
  const noticeRef = useRef<HTMLDivElement>(null);

  // After something is done, its button may be gone; move focus to the confirmation so keyboard
  // and screen-reader users aren't left with nothing selected.
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

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
          {notice && (
            <div ref={noticeRef} tabIndex={-1} className="outline-none">
              <Alert tone={notice.tone ?? 'success'} title={notice.title}>
                {notice.text}
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
              {project.confirmedDeliveryDate && (
                <p className="text-slate-700">
                  <span className="font-medium text-ink">Delivery date: </span>
                  {formatCalendarDate(project.confirmedDeliveryDate)}{' '}
                  <span className="text-sm text-slate-600">(confirmed by Prajzo)</span>
                </p>
              )}
              {project.revisions && project.status !== 'awaiting-review' && (
                <p className="text-slate-700">
                  <span className="font-medium text-ink">Rounds of changes used: </span>
                  {project.revisions.used} of {project.revisions.included} included
                </p>
              )}
            </Card>
          </section>

          {project.status === 'awaiting-information' && (
            <ReplyToQuestion project={project} onDone={onDone} onOutOfDate={onOutOfDate} />
          )}
          {project.status === 'awaiting-review' && (
            <ReviewProject project={project} onDone={onDone} onOutOfDate={onOutOfDate} />
          )}
          {project.quote && (
            <QuoteCard
              reference={project.reference}
              quote={project.quote}
              allowedActions={project.allowedActions}
              onDone={onDone}
              onOutOfDate={onOutOfDate}
            />
          )}

          <section aria-labelledby="request-heading">
            <h2 id="request-heading" className="text-xl font-semibold tracking-tight">
              Your request
            </h2>
            <RequestDetails project={project} />
          </section>

          {project.allowedActions.includes('cancel') && (
            <CancelProject
              reference={project.reference}
              onDone={onDone}
              onOutOfDate={onOutOfDate}
            />
          )}
        </div>

        <aside className="grid content-start gap-10">
          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-xl font-semibold tracking-tight">
              Timeline
            </h2>
            <Timeline entries={project.timeline} audience="customer" />
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
