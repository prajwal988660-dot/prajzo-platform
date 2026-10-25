import {
  adminOverviewSchema,
  projectStatusInfo,
  projectStatuses,
  type AdminOverview,
} from '@prajzo/shared';
import { Activity, FolderKanban, Inbox, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { cx } from '../../lib/cx';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import { useAuth } from '../auth/auth-context';
import { ActivityList } from './ActivityList';

/**
 * The administration overview. Every number is a real count from the database. The top section
 * is what is waiting for Prajzo right now; each card opens the matching list.
 */
export function AdminDashboardPage() {
  usePageTitle('Administration');
  const { user } = useAuth();
  const overview = useApi('/v1/admin/overview', adminOverviewSchema);

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-2 text-slate-600">Signed in as {user?.name ?? 'administrator'}.</p>

      <div className="mt-8 grid gap-12">
        {overview.status === 'loading' && <LoadingBlock label="Loading the overview" />}
        {overview.status === 'error' && (
          <LoadError message={overview.error.message} onRetry={overview.retry} />
        )}
        {overview.status === 'success' && <Overview data={overview.data} />}
      </div>
    </Container>
  );
}

function Overview({ data }: { data: AdminOverview }) {
  const { toDo, byStatus, total } = data.projectRequests;
  const waiting = [
    {
      label: 'New requests',
      hint: 'to review',
      count: toDo.newRequests,
      to: '/admin/projects?status=received',
    },
    {
      label: 'Customer replies',
      hint: 'waiting for you',
      count: toDo.replies,
      to: '/admin/projects?status=awaiting-information',
    },
    {
      label: 'Accepted quotes',
      hint: 'to start',
      count: toDo.accepted,
      to: '/admin/projects?status=approved',
    },
    {
      label: 'Changes asked for',
      hint: 'to make',
      count: toDo.revisions,
      to: '/admin/projects?status=revision-requested',
    },
    {
      label: 'Said it looks good',
      hint: 'to complete',
      count: toDo.signedOff,
      to: '/admin/projects?status=awaiting-review',
    },
    {
      label: 'New messages',
      hint: 'to read',
      count: data.contactMessages.unread,
      to: '/admin/messages?status=new',
    },
  ];

  return (
    <>
      <section aria-labelledby="todo-heading">
        <h2 id="todo-heading" className="text-xl font-semibold tracking-tight">
          Needs you now
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {waiting.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
              >
                <Card interactive className="h-full">
                  <p
                    className={cx(
                      'font-display text-3xl font-semibold tracking-tight',
                      item.count === 0 && 'text-slate-500',
                    )}
                  >
                    {item.count}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{item.label}</p>
                  <p className="text-sm text-slate-600">
                    {item.count === 0 ? 'Nothing waiting' : item.hint}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="status-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="status-heading" className="text-xl font-semibold tracking-tight">
            Projects by status
          </h2>
          <Link
            to="/admin/projects?status=all"
            className="text-sm font-medium text-brand-indigo underline underline-offset-2"
          >
            All {total} {total === 1 ? 'project' : 'projects'}
          </Link>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {projectStatuses.map((status) => (
            <li key={status}>
              <Link
                to={`/admin/projects?status=${status}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm transition hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-brand-blue"
              >
                <span className="font-medium text-ink">{projectStatusInfo[status].label}</span>{' '}
                <span className="font-semibold text-slate-700">{byStatus[status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="glance-heading">
        <h2 id="glance-heading" className="text-xl font-semibold tracking-tight">
          At a glance
        </h2>
        <ul className="mt-4 grid gap-5 sm:grid-cols-3">
          <Stat icon={Users} label="Customers" value={data.customers} />
          <Stat icon={FolderKanban} label="Project requests" value={total} />
          <Stat icon={Inbox} label="Contact messages" value={data.contactMessages.total} />
        </ul>
      </section>

      <section aria-labelledby="activity-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="activity-heading" className="text-xl font-semibold tracking-tight">
            Recent activity
          </h2>
          <Link
            to="/admin/activity"
            className="text-sm font-medium text-brand-indigo underline underline-offset-2"
          >
            See all activity
          </Link>
        </div>
        <div className="mt-4">
          {data.recentActivity.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nothing has happened yet"
              description="Project requests, quotes, answers and changes will be listed here as they happen."
            />
          ) : (
            <ActivityList entries={data.recentActivity} />
          )}
        </div>
      </section>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: number;
}) {
  return (
    <li>
      <Card className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-xl bg-indigo-50 text-brand-indigo">
          <Icon aria-hidden={true} className="size-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="font-display text-3xl font-semibold tracking-tight">{value}</p>
        </div>
      </Card>
    </li>
  );
}
