import { projectStatusInfo, type ProjectStatus } from '@prajzo/shared';
import { Badge } from '../../components/ui/Badge';

/** A project's status as a coloured label, with the same words everywhere. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, tone } = projectStatusInfo[status];
  return <Badge tone={tone}>{label}</Badge>;
}
