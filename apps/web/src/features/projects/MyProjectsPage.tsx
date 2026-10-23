import { projectListSchema } from '@prajzo/shared';
import { FolderKanban } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { useApi } from '../../lib/use-api';
import { useNoIndex } from '../../lib/use-no-index';
import { usePageTitle } from '../../lib/use-page-title';
import { PageIntro } from '../marketing/components/PageIntro';
import { ProjectListItem } from './ProjectListItem';

const pageSize = 10;

/** Every project the customer has sent, newest first. */
export function MyProjectsPage() {
  usePageTitle('My projects');
  useNoIndex();
  const [searchParams] = useSearchParams();
  const requested = Number(searchParams.get('page'));
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;
  const projects = useApi(`/v1/project-requests?page=${page}&limit=${pageSize}`, projectListSchema);

  return (
    <>
      <PageIntro eyebrow="My account" title="My projects">
        <p>Every project you&apos;ve sent us, with where it stands.</p>
      </PageIntro>

      <Container className="grid gap-8 py-12 sm:py-16">
        {projects.status === 'loading' && <LoadingBlock label="Loading your projects" />}
        {projects.status === 'error' && (
          <LoadError message={projects.error.message} onRetry={projects.retry} />
        )}
        {projects.status === 'success' && <ProjectsView list={projects.data} page={page} />}
      </Container>
    </>
  );
}

function ProjectsView({
  list,
  page,
}: {
  list: { items: Parameters<typeof ProjectListItem>[0]['project'][]; total: number; limit: number };
  page: number;
}) {
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));

  if (list.total === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Tell us about your idea and we'll reply with questions or a quote. Your projects will appear here."
        action={<ButtonLink to="/start-project">Start a project</ButtonLink>}
      />
    );
  }

  if (list.items.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="There are no projects on this page"
        description="You may have followed an old link."
        action={<ButtonLink to="/account/projects">Back to my projects</ButtonLink>}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">
          {list.total === 1 ? '1 project' : `${list.total} projects`}
        </p>
        <ButtonLink to="/start-project">Start a project</ButtonLink>
      </div>

      <ul aria-label="Your projects" className="grid gap-4">
        {list.items.map((project) => (
          <ProjectListItem key={project.reference} project={project} />
        ))}
      </ul>

      {totalPages > 1 && (
        <nav aria-label="Pages of projects" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <ButtonLink to={`?page=${page - 1}`} variant="secondary">
              Previous
            </ButtonLink>
          ) : (
            <span />
          )}
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </p>
          {page < totalPages ? (
            <ButtonLink to={`?page=${page + 1}`} variant="secondary">
              Next
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
