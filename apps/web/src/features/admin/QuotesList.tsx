import { formatRupees, type AdminQuote } from '@prajzo/shared';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { formatDateTime } from '../../lib/format';

/** Every quote that was sent for the project, newest first, with which one the customer accepted. */
export function QuotesList({ quotes }: { quotes: AdminQuote[] }) {
  if (quotes.length === 0) return null;
  const latest = quotes.length;
  const ordered = [...quotes].reverse();

  return (
    <section aria-labelledby="quotes-heading">
      <h2 id="quotes-heading" className="text-xl font-semibold tracking-tight">
        {quotes.length === 1 ? 'Quote' : 'Quotes'}
      </h2>
      <ul className="mt-4 grid gap-4">
        {ordered.map((quote) => (
          <li key={quote.version}>
            <Card className="grid gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-display text-2xl font-semibold tracking-tight">
                  {formatRupees(quote.amountPaise)}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  Quote {quote.version}
                  {quote.accepted && <Badge tone="success">Accepted</Badge>}
                  {!quote.accepted && quote.version === latest && (
                    <Badge tone="brand">Latest</Badge>
                  )}
                  {!quote.accepted && quote.version !== latest && (
                    <Badge tone="neutral">Replaced</Badge>
                  )}
                </p>
              </div>
              <p className="whitespace-pre-line text-ink">{quote.scope}</p>
              <p className="text-sm text-slate-600">
                {quote.revisionsIncluded} {quote.revisionsIncluded === 1 ? 'round' : 'rounds'} of
                changes included · sent by {quote.sentByName} on{' '}
                <time dateTime={quote.sentAt}>{formatDateTime(quote.sentAt)}</time>
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
