import {
  formatCalendarDate,
  projectStatusInfo,
  type AdminTimelineEntry,
  type TimelineEntry,
} from '@prajzo/shared';
import { formatDateTime } from '../../lib/format';

type Entry = TimelineEntry | AdminTimelineEntry;

/** Who did it, from the point of view of whoever is reading. */
function whoDid(entry: Entry, audience: 'customer' | 'admin'): string {
  if (audience === 'admin') return 'actorName' in entry ? entry.actorName : 'Prajzo';
  return entry.by === 'customer' ? 'You' : 'Prajzo';
}

/** What happened, in a few words. */
function headline(entry: Entry, audience: 'customer' | 'admin'): string {
  switch (entry.kind) {
    case 'status':
      return projectStatusInfo[entry.to].label;
    case 'reply':
      return audience === 'customer' ? "You answered Prajzo's question" : 'Answered the question';
    case 'delivery-date':
      return entry.from
        ? `Delivery date changed to ${formatCalendarDate(entry.to)}`
        : `Delivery date confirmed: ${formatCalendarDate(entry.to)}`;
    case 'sign-off':
      return audience === 'customer'
        ? 'You said the project looks good'
        : 'Said the project looks good';
  }
}

/** What was written with it: a note, an answer, or the date it replaced. */
function detail(entry: Entry): string | null {
  switch (entry.kind) {
    case 'status':
      return entry.note;
    case 'reply':
      return entry.text;
    case 'delivery-date': {
      const was = entry.from ? `It was ${formatCalendarDate(entry.from)}. ` : '';
      return `${was}${entry.note ?? ''}`.trim() || null;
    }
    case 'sign-off':
      return null;
  }
}

/**
 * A project's story, oldest first: every change of status, answer, date and sign-off, with who did
 * it and when (India time). The same list is used for customers (who see "You" and "Prajzo") and
 * for admins (who see names).
 */
export function Timeline({
  entries,
  audience,
}: {
  entries: Entry[];
  audience: 'customer' | 'admin';
}) {
  const last = entries.length - 1;
  return (
    <ol className="mt-5 grid gap-6 border-l-2 border-slate-200 pl-6">
      {entries.map((entry, index) => {
        const text = detail(entry);
        return (
          <li key={`${entry.kind}-${entry.at}-${index}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[2.1rem] top-1.5 size-3 rounded-full ring-4 ring-white ${
                index === last ? 'bg-brand-indigo' : 'bg-slate-300'
              }`}
            />
            <p className="font-semibold text-ink">{headline(entry, audience)}</p>
            <p className="text-sm text-slate-600">
              {whoDid(entry, audience)} ·{' '}
              <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
            </p>
            {text && (
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                &ldquo;{text}&rdquo;
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
