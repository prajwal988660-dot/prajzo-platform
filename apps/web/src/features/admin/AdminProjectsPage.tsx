import {
  adminProjectFilters,
  adminProjectListSchema,
  projectStatusInfo,
  type AdminProjectFilter,
  type AdminProjectSummary,
} from '@prajzo/shared';
import { FolderKanban, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField, TextField } from '../../components/ui/Field';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { Pagination, pageFromAddress } from '../../components/ui/Pagination';
import { formatDate } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { useTypedQuery } from '../../lib/use-typed-query';
import { usePageTitle } from '../../lib/use-page-title';
import { StatusBadge } from '../projects/StatusBadge';

const pageSize = 20;

const isFilter = (value: string | null): value is AdminProjectFilter =>
  value !== null && (adminProjectFilters as readonly string[]).includes(value);

/** Every project request, with a filter by status and a search. Open projects are shown first. */
export function AdminProjectsPage() {
  usePageTitle('Projects');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = pageFromAddress(searchParams.get('page'));
  const rawStatus = searchParams.get('status');
  const status: AdminProjectFilter = isFilter(rawStatus) ? rawStatus : 'open';
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);

  const parameters = new URLSearchParams({ status, page: String(page), limit: String(pageSize) });
  if (query) parameters.set('q', query);
  const projects = useApi(
    `/v1/admin/project-requests?${parameters.toString()}`,
    adminProjectListSchema,
  );

  const [typed, setTyped] = useTypedQuery(query);

  /** Puts the filter and the search in the address. The page number starts again at 1. */
  const show = (changes: { status?: AdminProjectFilter }) => {
    const nextStatus = changes.status ?? status;
    const nextQuery = typed.trim().slice(0, 100);
    const next = new URLSearchParams();
    if (nextStatus !== 'open') next.set('status', nextStatus);
    if (nextQuery) next.set('q', nextQuery);
    setSearchParams(next);
  };
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    show({});
  };

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>

      <form
        role="search"
        aria-label="Find projects"
        onSubmit={apply}
        className="mt-6 grid items-start gap-4 sm:grid-cols-[1fr_16rem_auto]"
      >
        <TextField
          type="search"
          label="Search"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          maxLength={100}
          hint="By reference number, project name, or the customer's name or email."
        />
        <SelectField
          label="Show"
          value={status}
          onChange={(event) => {
            const chosen = event.target.value;
            if (isFilter(chosen)) show({ status: chosen });
          }}
        >
          <option value="open">Open projects</option>
          <option value="all">All projects</option>
          {Object.entries(projectStatusInfo).map(([key, info]) => (
            <option key={key} value={key}>
              {info.label}
            </option>
          ))}
        </SelectField>
        <Button type="submit" className="sm:mt-7">
          <Search aria-hidden="true" className="size-4" />
          Search
        </Button>
      </form>

      <div className="mt-8 grid gap-6">
        {projects.status === 'loading' && <LoadingBlock label="Loading the projects" />}
        {projects.status === 'error' && (
          <LoadError message={projects.error.message} onRetry={projects.retry} />
        )}
        {projects.status === 'success' && (
          <Results
            list={projects.data}
            page={page}
            filtered={status !== 'open' || query !== ''}
            query={query}
          />
        )}
      </div>
    </Container>
  );
}

function Results({
  list,
  page,
  filtered,
  query,
}: {
  list: { items: AdminProjectSummary[]; total: number; limit: number };
  page: number;
  filtered: boolean;
  query: string;
}) {
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));

  if (list.total === 0) {
    return filtered ? (
      <EmptyState
        headingLevel={2}
        icon={FolderKanban}
        title="No projects match"
        description="Try a different search, or choose another status."
        action={<ButtonLink to="/admin/projects">Show open projects</ButtonLink>}
      />
    ) : (
      <EmptyState
        headingLevel={2}
        icon={FolderKanban}
        title="No open projects"
        description="Requests will appear here as soon as customers send them."
        action={
          <ButtonLink to="/admin/projects?status=all" variant="secondary">
            Show every project
          </ButtonLink>
        }
      />
    );
  }

  if (list.items.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        icon={FolderKanban}
        title="There are no projects on this page"
        description="You may have followed an old link."
        action={<ButtonLink to="/admin/projects">Back to the projects</ButtonLink>}
      />
    );
  }

  return (
    <>
      <p className="text-slate-600">
        {list.total === 1 ? '1 project' : `${list.total} projects`}
        {query ? <> matching &ldquo;{query}&rdquo;</> : null}
      </p>
      <ul aria-label="Projects" className="grid gap-4">
        {list.items.map((project) => (
          <ProjectRow key={project.reference} project={project} />
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} label="Pages of projects" />
    </>
  );
}

function ProjectRow({ project }: { project: AdminProjectSummary }) {
  return (
    <li>
      <Link
        to={`/admin/projects/${project.reference}`}
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
      >
        <Card interactive className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">{project.title}</p>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-mono">{project.reference}</span> · {project.categoryTitle} ·
              Sent {formatDate(project.createdAt)}
            </p>
            <p className="text-sm text-slate-600">
              {project.customerName} · {project.customerEmail}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            {project.waitingOn === 'prajzo' && <Badge tone="warning">Needs you</Badge>}
            {project.waitingOn === 'customer' && <Badge>Waiting for customer</Badge>}
            {project.customerReplied && <Badge tone="brand">Customer replied</Badge>}
            {project.customerSignedOff && <Badge tone="success">Said it looks good</Badge>}
          </div>
        </Card>
      </Link>
    </li>
  );
}
