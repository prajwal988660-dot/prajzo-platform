import { adminOverviewSchema } from '@prajzo/shared';
import { FolderKanban, Inbox, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import { Container } from '../../components/layout/Container';
import { Card } from '../../components/ui/Card';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import { useAuth } from '../auth/auth-context';

/**
 * The administration overview. The numbers are real counts from the database. Reading and
 * answering messages, and reviewing projects, arrive in Phase 5; this page says so.
 */
export function AdminDashboardPage() {
  usePageTitle('Administration');
  const { user } = useAuth();
  const overview = useApi('/v1/admin/overview', adminOverviewSchema);

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-2 text-slate-600">Signed in as {user?.name ?? 'administrator'}.</p>

      <div className="mt-8">
        {overview.status === 'loading' && <LoadingBlock label="Loading the overview" />}
        {overview.status === 'error' && (
          <LoadError message={overview.error.message} onRetry={overview.retry} />
        )}
        {overview.status === 'success' && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Stat icon={Users} label="Customers" value={overview.data.customers} />
            <Stat
              icon={FolderKanban}
              label="New project requests"
              value={overview.data.projectRequests.received}
            />
            <Stat
              icon={FolderKanban}
              label="All project requests"
              value={overview.data.projectRequests.total}
            />
            <Stat icon={Inbox} label="New messages" value={overview.data.contactMessages.unread} />
            <Stat icon={Inbox} label="All messages" value={overview.data.contactMessages.total} />
          </ul>
        )}
      </div>

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-slate-600">
        Project requests and messages from the contact form are saved in the database. Screens for
        reading and answering them are planned for the next phase; until then, view them in MongoDB
        Atlas under Browse Collections → projectrequests and contactmessages.
      </p>
    </Container>
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
