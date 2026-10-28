import { auditListSchema, auditTargetTypes, type AuditTargetType } from '@prajzo/shared';
import { Activity } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { Pagination, pageFromAddress } from '../../components/ui/Pagination';
import { cx } from '../../lib/cx';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import { ActivityList } from './ActivityList';

const pageSize = 25;

type Filter = 'all' | AuditTargetType;
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'project', label: 'Projects' },
  { value: 'contact-message', label: 'Messages' },
  { value: 'category', label: 'Categories' },
  { value: 'package', label: 'Packages' },
  { value: 'template', label: 'Templates' },
  { value: 'demo-submission', label: 'Demo messages' },
];

const isFilter = (value: string | null): value is Filter =>
  value === 'all' || (auditTargetTypes as readonly (string | null)[]).includes(value);

/** What admins and customers have done, newest first: a record of who changed what, and when. */
export function AdminActivityPage() {
  usePageTitle('Activity');
  const [searchParams] = useSearchParams();
  const page = pageFromAddress(searchParams.get('page'));
  const rawFilter = searchParams.get('type');
  const filter: Filter = isFilter(rawFilter) ? rawFilter : 'all';
  const activity = useApi(
    `/v1/admin/activity?targetType=${filter}&page=${page}&limit=${pageSize}`,
    auditListSchema,
  );

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        A record of what admins and customers have done: status changes, quotes, answers, messages
        and catalogue edits. Times are India time.
      </p>

      <nav aria-label="Filter the activity" className="mt-6">
        <ul className="-mx-1 flex flex-wrap gap-1 text-sm font-medium">
          {filters.map((option) => {
            const active = option.value === filter;
            return (
              <li key={option.value}>
                <Link
                  to={option.value === 'all' ? '/admin/activity' : `?type=${option.value}`}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'block rounded-full px-4 py-2 transition',
                    active
                      ? 'bg-ink text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-ink',
                  )}
                >
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-8 grid gap-6">
        {activity.status === 'loading' && <LoadingBlock label="Loading the activity" />}
        {activity.status === 'error' && (
          <LoadError message={activity.error.message} onRetry={activity.retry} />
        )}
        {activity.status === 'success' && (
          <>
            {activity.data.total === 0 ? (
              <EmptyState
                headingLevel={2}
                icon={Activity}
                title="Nothing here yet"
                description={
                  filter === 'all'
                    ? 'Activity appears as customers and admins use the site.'
                    : 'Nothing of this kind has happened yet.'
                }
                action={
                  filter === 'all' ? undefined : (
                    <ButtonLink to="/admin/activity" variant="secondary">
                      Show everything
                    </ButtonLink>
                  )
                }
              />
            ) : activity.data.items.length === 0 ? (
              <EmptyState
                headingLevel={2}
                icon={Activity}
                title="There is nothing on this page"
                description="You may have followed an old link."
                action={<ButtonLink to="/admin/activity">Back to the start</ButtonLink>}
              />
            ) : (
              <>
                <ActivityList entries={activity.data.items} />
                <Pagination
                  page={page}
                  totalPages={Math.max(1, Math.ceil(activity.data.total / activity.data.limit))}
                  label="Pages of activity"
                />
              </>
            )}
          </>
        )}
      </div>
    </Container>
  );
}
