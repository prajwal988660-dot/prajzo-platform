import { formatRupees, type ProjectDetail, type Quote } from '@prajzo/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextAreaField } from '../../components/ui/Field';
import { formatDate } from '../../lib/format';
import { useProjectAction, type Notice } from './use-project-action';

/**
 * The quote: the price, what it includes and the revisions it includes. While it waits for an
 * answer, the customer can accept it or decline it (which cancels the project). The buttons show
 * only when the server says they are allowed.
 */
export function QuoteCard({
  reference,
  quote,
  allowedActions,
  onDone,
  onOutOfDate,
}: {
  reference: string;
  quote: Quote;
  allowedActions: ProjectDetail['allowedActions'];
  onDone: (project: ProjectDetail, notice: Notice) => void;
  onOutOfDate: (message: string) => void;
}) {
  const canAccept = allowedActions.includes('accept-quote');
  const canDecline = allowedActions.includes('decline-quote');
  return (
    <section aria-labelledby="quote-heading">
      <h2 id="quote-heading" className="text-xl font-semibold tracking-tight">
        {quote.accepted ? 'Your accepted quote' : 'Your quote'}
      </h2>
      <Card className="mt-4 grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-display text-3xl font-semibold tracking-tight">
            {formatRupees(quote.amountPaise)}
          </p>
          <p className="text-sm text-slate-600">
            Quote {quote.version} · sent {formatDate(quote.sentAt)}{' '}
            {quote.accepted && <Badge tone="success">Accepted</Badge>}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-600">What the price includes</h3>
          <p className="mt-1 whitespace-pre-line text-ink">{quote.scope}</p>
        </div>
        <p className="text-sm text-slate-700">
          Rounds of changes included:{' '}
          <strong className="text-ink">{quote.revisionsIncluded}</strong>
        </p>
        {(canAccept || canDecline) && (
          <QuoteAnswer
            reference={reference}
            quote={quote}
            canAccept={canAccept}
            canDecline={canDecline}
            onDone={onDone}
            onOutOfDate={onOutOfDate}
          />
        )}
      </Card>
    </section>
  );
}

function QuoteAnswer({
  reference,
  quote,
  canAccept,
  canDecline,
  onDone,
  onOutOfDate,
}: {
  reference: string;
  quote: Quote;
  canAccept: boolean;
  canDecline: boolean;
  onDone: (project: ProjectDetail, notice: Notice) => void;
  onOutOfDate: (message: string) => void;
}) {
  const [asking, setAsking] = useState<'accept' | 'decline' | null>(null);
  const [reason, setReason] = useState('');
  const { state, run, reset } = useProjectAction(reference, onDone, onOutOfDate);
  const working = state.kind === 'working';

  const close = () => {
    setAsking(null);
    reset();
  };

  if (asking === 'accept') {
    return (
      <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <p className="font-semibold text-ink">Accept this quote?</p>
        <p className="text-sm text-slate-700">
          By accepting, you agree to this price and what it includes, and to our{' '}
          <Link to="/terms" className="font-medium text-brand-indigo underline underline-offset-2">
            Terms and Conditions
          </Link>
          . We&apos;ll then confirm a delivery date and start building.
        </p>
        {state.kind === 'failed' && (
          <Alert tone="error" title="The quote wasn't accepted">
            {state.message}
          </Alert>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            loading={working}
            onClick={() =>
              void run(
                { action: 'accept-quote', quoteVersion: quote.version },
                {
                  title: 'You accepted the quote',
                  text: "Thank you. We'll confirm a delivery date and start building.",
                },
              )
            }
          >
            {working ? 'Accepting…' : 'Yes, accept the quote'}
          </Button>
          <Button variant="ghost" disabled={working} onClick={close}>
            Not yet
          </Button>
        </div>
      </div>
    );
  }

  if (asking === 'decline') {
    return (
      <div className="grid gap-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
        <p className="font-semibold text-ink">Decline this quote?</p>
        <p className="text-sm text-slate-700">
          Declining cancels this project. You&apos;re welcome to start a new one at any time, or
          contact us first if something in the quote could be different.
        </p>
        <TextAreaField
          label="Reason (optional)"
          rows={3}
          maxLength={500}
          hint="It helps us improve. You can leave it empty."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {state.kind === 'failed' && (
          <Alert tone="error" title="The quote wasn't declined">
            {state.message}
          </Alert>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            className="bg-rose-700 hover:bg-rose-800"
            loading={working}
            onClick={() =>
              void run(
                {
                  action: 'decline-quote',
                  quoteVersion: quote.version,
                  note: reason.trim() || undefined,
                },
                {
                  title: 'You declined the quote',
                  text: "This project has been cancelled. You're welcome to start a new project at any time.",
                },
              )
            }
          >
            {working ? 'Declining…' : 'Yes, decline and cancel'}
          </Button>
          <Button variant="ghost" disabled={working} onClick={close}>
            Keep it open
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {canAccept && <Button onClick={() => setAsking('accept')}>Accept this quote</Button>}
      {canDecline && (
        <Button variant="secondary" onClick={() => setAsking('decline')}>
          Decline this quote
        </Button>
      )}
    </div>
  );
}
