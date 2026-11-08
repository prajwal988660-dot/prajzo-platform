import {
  adminDemoSubmissionListSchema,
  adminDemoSubmissionResponseSchema,
  type AdminDemoSubmission,
  type AdminDemoSubmissionList,
  type DemoSubmissionStatus,
} from '@prajzo/shared';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { Pagination, pageFromAddress } from '../../components/ui/Pagination';
import { apiRequest } from '../../lib/api';
import { emailLinkTo } from '../../lib/contact-links';
import { cx } from '../../lib/cx';
import { submitErrorMessage } from '../../lib/form-errors';
import { formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';

const pageSize = 20;
type Filter = 'all' | 'new';
const templateNames: Record<string, string> = {
  portfolio: 'Portfolio',
  business: 'Business',
  event: 'Event',
  catalogue: 'Catalogue',
  forms: 'Forms',
};

/**
 * Messages people sent from the live demos' contact forms (D-014). They usually come from people
 * trying a design, so they are kept apart from the real contact messages, and each one is
 * deleted by itself after 7 days.
 */
export function AdminDemoMessagesPage() {
  usePageTitle('Demo messages');
  const [searchParams] = useSearchParams();
  const page = pageFromAddress(searchParams.get('page'));
  const filter: Filter = searchParams.get('status') === 'new' ? 'new' : 'all';
  const parameters = new URLSearchParams({
    status: filter,
    page: String(page),
    limit: String(pageSize),
  });
  const submissions = useApi(
    `/v1/admin/demo-submissions?${parameters.toString()}`,
    adminDemoSubmissionListSchema,
  );

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Demo messages</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Sent from the contact forms inside the live demos, usually by someone trying a design. Each
        one is deleted by itself 7 days after it arrives. Real enquiries are in{' '}
        <Link to="/admin/messages" className="font-medium text-brand-indigo underline">
          Messages
        </Link>
        .
      </p>
      <nav aria-label="Filter the demo messages" className="mt-6 flex flex-wrap gap-2">
        {(['all', 'new'] as const).map((value) => (
          <Link
            key={value}
            to={value === 'all' ? '/admin/demo-messages' : '?status=new'}
            aria-current={filter === value ? 'page' : undefined}
            className={cx(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium',
              filter === value
                ? 'border-ink bg-ink text-white'
                : 'border-slate-300 bg-white text-ink hover:border-ink',
            )}
          >
            {value === 'all' ? 'All' : 'New'}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        {submissions.status === 'loading' && <LoadingBlock label="Loading demo messages" />}
        {submissions.status === 'error' && (
          <LoadError message={submissions.error.message} onRetry={submissions.retry} />
        )}
        {submissions.status === 'success' && (
          <List list={submissions.data} page={page} filter={filter} />
        )}
      </div>
    </Container>
  );
}

function List({
  list,
  page,
  filter,
}: {
  list: AdminDemoSubmissionList;
  page: number;
  filter: Filter;
}) {
  const [changed, setChanged] = useState<Record<string, AdminDemoSubmission>>({});
  if (list.items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={filter === 'new' ? 'No new demo messages' : 'No demo messages'}
        description="Messages from the live demos show up here for 7 days."
      />
    );
  }
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));
  return (
    <>
      <ul className="grid gap-4">
        {list.items.map((item) => (
          <SubmissionCard
            key={item.id}
            submission={changed[item.id] ?? item}
            onChanged={(updated) => setChanged((all) => ({ ...all, [updated.id]: updated }))}
          />
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} label="Pages of demo messages" />
    </>
  );
}

type Outcome = { kind: 'idle' } | { kind: 'working' } | { kind: 'done' | 'failed'; text: string };

function SubmissionCard({
  submission,
  onChanged,
}: {
  submission: AdminDemoSubmission;
  onChanged: (submission: AdminDemoSubmission) => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  /** Changes the status, and shows it only once the server has made the change. */
  const change = async (status: DemoSubmissionStatus) => {
    setOutcome({ kind: 'working' });
    try {
      const { submission: updated } = await apiRequest(
        `/v1/admin/demo-submissions/${encodeURIComponent(submission.id)}`,
        adminDemoSubmissionResponseSchema,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      );
      onChanged(updated);
      setOutcome({ kind: 'done', text: status === 'read' ? 'Marked as read.' : 'Marked as new.' });
    } catch (error) {
      setOutcome({
        kind: 'failed',
        text: submitErrorMessage(error, 'Something went wrong. Please try again.'),
      });
    }
  };

  return (
    <li>
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">{submission.name}</p>
            <p className="text-sm text-slate-600">
              From the {templateNames[submission.template] ?? submission.template} demo ·{' '}
              <time dateTime={submission.createdAt}>{formatDateTime(submission.createdAt)}</time>
            </p>
          </div>
          <Badge tone={submission.status === 'new' ? 'brand' : 'neutral'}>
            {submission.status === 'new' ? 'New' : 'Read'}
          </Badge>
        </div>
        <p className="break-all text-sm text-slate-700">{submission.email}</p>
        {submission.form === 'registration' ? (
          <dl className="grid gap-1 text-sm text-ink sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="font-semibold">Registered for</dt>
            <dd>{submission.choice}</dd>
            {submission.organisation ? (
              <>
                <dt className="font-semibold">Organisation</dt>
                <dd>{submission.organisation}</dd>
              </>
            ) : null}
            {submission.phone ? (
              <>
                <dt className="font-semibold">Phone</dt>
                <dd>{submission.phone}</dd>
              </>
            ) : null}
          </dl>
        ) : submission.form === 'enquiry' ? (
          <div className="grid gap-2">
            <dl className="grid gap-1 text-sm text-ink sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="font-semibold">Asked about</dt>
              <dd>{submission.choice}</dd>
              {submission.quantity !== null ? (
                <>
                  <dt className="font-semibold">How many</dt>
                  <dd>{submission.quantity}</dd>
                </>
              ) : null}
              {submission.phone ? (
                <>
                  <dt className="font-semibold">Phone</dt>
                  <dd>{submission.phone}</dd>
                </>
              ) : null}
            </dl>
            {submission.message ? (
              <p className="whitespace-pre-line text-ink">{submission.message}</p>
            ) : null}
          </div>
        ) : (
          <p className="whitespace-pre-line text-ink">{submission.message}</p>
        )}
        <p className="text-sm text-slate-600">
          Deleted by itself on{' '}
          <time dateTime={submission.expiresAt}>{formatDateTime(submission.expiresAt)}</time>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            className={buttonClasses({ variant: 'primary', size: 'sm' })}
            href={emailLinkTo(
              submission.email,
              'Your message from the Prajzo demo',
              `Hi ${submission.name},\n\n`,
            )}
          >
            Reply by email <span className="sr-only">to {submission.name}</span>
          </a>
          <Button
            variant="secondary"
            size="sm"
            disabled={outcome.kind === 'working'}
            onClick={() => void change(submission.status === 'new' ? 'read' : 'new')}
          >
            {submission.status === 'new' ? 'Mark as read' : 'Mark as new'}
          </Button>
          {outcome.kind === 'done' && (
            <p role="status" className="text-sm font-medium text-emerald-800">
              {outcome.text}
            </p>
          )}
        </div>
        {outcome.kind === 'failed' && (
          <Alert tone="error" title="The message wasn't changed">
            {outcome.text}
          </Alert>
        )}
      </Card>
    </li>
  );
}
