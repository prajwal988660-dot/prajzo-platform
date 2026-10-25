import {
  adminMessageFilters,
  adminMessageListSchema,
  adminMessageResponseSchema,
  type AdminContactMessage,
  type AdminMessageFilter,
  type AdminMessageList,
  type ContactMessageStatus,
} from '@prajzo/shared';
import { Inbox, Mail, MessageCircle, Phone, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink, buttonClasses } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/Field';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { Pagination, pageFromAddress } from '../../components/ui/Pagination';
import { apiRequest } from '../../lib/api';
import { callLink, emailLinkTo, whatsappLinkTo } from '../../lib/contact-links';
import { cx } from '../../lib/cx';
import { submitErrorMessage } from '../../lib/form-errors';
import { formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { useTypedQuery } from '../../lib/use-typed-query';
import { usePageTitle } from '../../lib/use-page-title';

const pageSize = 20;

const filterLabels: Record<AdminMessageFilter, string> = {
  inbox: 'Inbox',
  new: 'New',
  read: 'Read',
  archived: 'Archived',
  all: 'All',
};

const isFilter = (value: string | null): value is AdminMessageFilter =>
  value !== null && (adminMessageFilters as readonly string[]).includes(value);

/** Messages sent from the contact form. Replies are written in the admin's own email app. */
export function AdminMessagesPage() {
  usePageTitle('Messages');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = pageFromAddress(searchParams.get('page'));
  const rawStatus = searchParams.get('status');
  const status: AdminMessageFilter = isFilter(rawStatus) ? rawStatus : 'inbox';
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);

  const parameters = new URLSearchParams({ status, page: String(page), limit: String(pageSize) });
  if (query) parameters.set('q', query);
  const path = `/v1/admin/contact-messages?${parameters.toString()}`;
  const messages = useApi(path, adminMessageListSchema);

  const filterAddress = (value: AdminMessageFilter) => {
    const next = new URLSearchParams();
    if (value !== 'inbox') next.set('status', value);
    if (query) next.set('q', query);
    const text = next.toString();
    return text ? `?${text}` : '/admin/messages';
  };

  const [typed, setTyped] = useTypedQuery(query);
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = typed.trim().slice(0, 100);
    const next = new URLSearchParams();
    if (status !== 'inbox') next.set('status', status);
    if (text) next.set('q', text);
    setSearchParams(next);
  };

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Messages sent from the contact form. &ldquo;Reply by email&rdquo; opens your own email app
        with the sender&apos;s address filled in; nothing is sent from here.
      </p>

      <nav aria-label="Filter the messages" className="mt-6">
        <ul className="-mx-1 flex flex-wrap gap-1 text-sm font-medium">
          {adminMessageFilters.map((value) => {
            const active = value === status;
            return (
              <li key={value}>
                <Link
                  to={filterAddress(value)}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'block rounded-full px-4 py-2 transition',
                    active
                      ? 'bg-ink text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-ink',
                  )}
                >
                  {filterLabels[value]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form
        role="search"
        aria-label="Find messages"
        onSubmit={search}
        className="mt-6 grid items-start gap-4 sm:grid-cols-[1fr_auto]"
      >
        <TextField
          type="search"
          label="Search"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          maxLength={100}
          hint="By the sender's name or email address, or by what they wrote."
        />
        <Button type="submit" className="sm:mt-7">
          <Search aria-hidden="true" className="size-4" />
          Search
        </Button>
      </form>

      <div className="mt-8 grid gap-6">
        {messages.status === 'loading' && <LoadingBlock label="Loading the messages" />}
        {messages.status === 'error' && (
          <LoadError message={messages.error.message} onRetry={messages.retry} />
        )}
        {messages.status === 'success' && (
          // Keyed by the request, so what was changed on one page never leaks onto another.
          <Results
            key={path}
            list={messages.data}
            page={page}
            filtered={status !== 'inbox' || query !== ''}
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
  list: AdminMessageList;
  page: number;
  filtered: boolean;
  query: string;
}) {
  // Messages changed on this page: shown as changed straight away, without reloading the list.
  const [changed, setChanged] = useState<Record<string, AdminContactMessage>>({});
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));

  if (list.total === 0) {
    return filtered ? (
      <EmptyState
        headingLevel={2}
        icon={Inbox}
        title="No messages match"
        description="Try a different search, or look in another folder."
        action={<ButtonLink to="/admin/messages">Back to the inbox</ButtonLink>}
      />
    ) : (
      <EmptyState
        headingLevel={2}
        icon={Inbox}
        title="Your inbox is empty"
        description="Messages from the contact form appear here."
      />
    );
  }
  if (list.items.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        icon={Inbox}
        title="There are no messages on this page"
        description="You may have followed an old link."
        action={<ButtonLink to="/admin/messages">Back to the inbox</ButtonLink>}
      />
    );
  }

  return (
    <>
      <p className="text-slate-600">
        {list.total === 1 ? '1 message' : `${list.total} messages`}
        {query ? <> matching &ldquo;{query}&rdquo;</> : null}
      </p>
      <ul aria-label="Messages" className="grid gap-4">
        {list.items.map((item) => {
          const message = changed[item.id] ?? item;
          return (
            <MessageCard
              key={message.id}
              message={message}
              onChanged={(updated) => setChanged((all) => ({ ...all, [updated.id]: updated }))}
            />
          );
        })}
      </ul>
      <Pagination page={page} totalPages={totalPages} label="Pages of messages" />
    </>
  );
}

type Outcome =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; text: string }
  | { kind: 'failed'; text: string };

const statusBadge: Record<ContactMessageStatus, { tone: 'warning' | 'neutral'; label: string }> = {
  new: { tone: 'warning', label: 'New' },
  read: { tone: 'neutral', label: 'Read' },
  archived: { tone: 'neutral', label: 'Archived' },
};

function MessageCard({
  message,
  onChanged,
}: {
  message: AdminContactMessage;
  onChanged: (message: AdminContactMessage) => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const working = outcome.kind === 'working';
  const call = message.phone ? callLink(message.phone) : null;
  const whatsapp = message.phone
    ? whatsappLinkTo(message.phone, `Hi ${message.name}, thanks for contacting Prajzo.`)
    : null;
  const interest = [message.websiteTypeTitle, message.packageName].filter(Boolean).join(' · ');
  const badge = statusBadge[message.status];

  /** Asks the server to change the status, and shows the change only once the server has made it. */
  const change = async (status: ContactMessageStatus, done: string) => {
    setOutcome({ kind: 'working' });
    try {
      const { message: updated } = await apiRequest(
        `/v1/admin/contact-messages/${encodeURIComponent(message.id)}`,
        adminMessageResponseSchema,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      );
      onChanged(updated);
      setOutcome({ kind: 'done', text: done });
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
            <p className="text-base font-semibold text-ink">{message.name}</p>
            <p className="text-sm text-slate-600">
              <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
            </p>
          </div>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <Mail aria-hidden="true" className="size-4 text-slate-500" />
            <a href={emailLinkTo(message.email)} className="break-all underline underline-offset-2">
              {message.email}
            </a>
          </li>
          {message.phone && (
            <li className="flex items-center gap-2">
              <Phone aria-hidden="true" className="size-4 text-slate-500" />
              {call ? (
                <a href={call} className="underline underline-offset-2">
                  {message.phone}
                </a>
              ) : (
                message.phone
              )}
            </li>
          )}
          {whatsapp && (
            <li className="flex items-center gap-2">
              <MessageCircle aria-hidden="true" className="size-4 text-slate-500" />
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                WhatsApp <span className="sr-only">{message.name} (opens in a new tab)</span>
              </a>
            </li>
          )}
        </ul>

        {interest && (
          <p className="text-sm text-slate-600">
            Interested in: <span className="text-ink">{interest}</span>
          </p>
        )}
        <p className="whitespace-pre-line break-words text-ink">{message.message}</p>

        <div className="flex flex-wrap items-center gap-3">
          <a
            className={buttonClasses({ variant: 'primary', size: 'sm' })}
            href={emailLinkTo(
              message.email,
              'Re: your message to Prajzo',
              `Hi ${message.name},\n\n`,
            )}
          >
            Reply by email <span className="sr-only">to {message.name}</span>
          </a>
          {message.status === 'new' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={working}
              onClick={() => void change('read', 'Marked as read.')}
            >
              Mark as read
            </Button>
          )}
          {message.status === 'read' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={working}
              onClick={() => void change('new', 'Marked as new.')}
            >
              Mark as new
            </Button>
          )}
          {message.status !== 'archived' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={working}
              onClick={() => void change('archived', 'Archived.')}
            >
              Archive
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={working}
              onClick={() => void change('read', 'Moved back to the inbox.')}
            >
              Move to inbox
            </Button>
          )}
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
