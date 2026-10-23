import type { ProjectSummary } from '@prajzo/shared';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../lib/format';
import { StatusBadge } from './StatusBadge';

/** One project in a list: its name and reference number, when it was sent, and its status. */
export function ProjectListItem({ project }: { project: ProjectSummary }) {
  return (
    <li>
      <Link
        to={`/account/projects/${project.reference}`}
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
      >
        <Card interactive className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">{project.title}</p>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-mono">{project.reference}</span> · {project.categoryTitle} ·
              Sent {formatDate(project.createdAt)}
            </p>
          </div>
          <StatusBadge status={project.status} />
        </Card>
      </Link>
    </li>
  );
}
