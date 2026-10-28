import type { AuditEntry } from '@prajzo/shared';
import { Link } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { formatDateTime } from '../../lib/format';

/** Where an entry in the activity log leads, so an admin can open the thing it was about. */
function targetLink(entry: AuditEntry): string | null {
  switch (entry.targetType) {
    case 'project':
      return `/admin/projects/${entry.targetId}`;
    case 'category':
      return `/admin/catalogue/categories/${entry.targetId}`;
    case 'package':
      return `/admin/catalogue/packages/${entry.targetId}`;
    case 'contact-message':
      return '/admin/messages?status=all';
    case 'template':
      return `/admin/templates/${entry.targetId}`;
    case 'demo-submission':
      return '/admin/demo-messages';
  }
}

/** What people did, newest first: who, what, and when (India time). */
export function ActivityList({ entries }: { entries: AuditEntry[] }) {
  return (
    <ul className="grid gap-3">
      {entries.map((entry) => {
        const link = targetLink(entry);
        return (
          <li
            key={entry.id}
            className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 rounded-xl border border-slate-200/80 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="text-ink">
                {link ? (
                  <Link
                    to={link}
                    className="font-medium text-brand-indigo underline underline-offset-2"
                  >
                    {entry.summary}
                  </Link>
                ) : (
                  entry.summary
                )}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>{entry.actorName}</span>
                <Badge tone={entry.actorRole === 'admin' ? 'brand' : 'neutral'}>
                  {entry.actorRole === 'admin' ? 'Admin' : 'Customer'}
                </Badge>
              </p>
            </div>
            <time dateTime={entry.at} className="shrink-0 text-sm text-slate-600">
              {formatDateTime(entry.at)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
