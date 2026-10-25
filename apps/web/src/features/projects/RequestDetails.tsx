import {
  contactPreferenceLabels,
  projectFeatureLabels,
  projectIntegrationLabels,
  type ProjectDetail,
} from '@prajzo/shared';
import { Detail, DetailList } from '../../components/ui/DetailList';
import { formatCalendarDate } from '../../lib/format';

type Request = Pick<
  ProjectDetail,
  | 'categoryTitle'
  | 'packageName'
  | 'description'
  | 'features'
  | 'integrations'
  | 'preferredDate'
  | 'contactPreference'
  | 'phone'
  | 'notes'
>;

/** What the customer asked for, as they filled it in. Shown to the customer and to admins. */
export function RequestDetails({
  project,
  audience = 'customer',
}: {
  project: Request;
  audience?: 'customer' | 'admin';
}) {
  const features = project.features.map((feature) => projectFeatureLabels[feature]);
  const integrations = project.integrations.map(
    (integration) => projectIntegrationLabels[integration],
  );
  return (
    <DetailList>
      <Detail term="Type of website">{project.categoryTitle}</Detail>
      <Detail term="Package">{project.packageName ?? 'Not chosen yet'}</Detail>
      <Detail term="About the project">
        <span className="whitespace-pre-line">{project.description}</span>
      </Detail>
      <Detail term="Features">{features.length > 0 ? features.join(', ') : 'None chosen'}</Detail>
      <Detail term="Services to connect">
        {integrations.length > 0 ? integrations.join(', ') : 'None chosen'}
      </Detail>
      <Detail term="Preferred date">
        {project.preferredDate ? (
          <>
            {formatCalendarDate(project.preferredDate)}{' '}
            <span className="text-sm text-slate-600">(a wish, not a promise)</span>
          </>
        ) : (
          'No date given'
        )}
      </Detail>
      <Detail term={audience === 'admin' ? 'How they want to be contacted' : 'How to contact you'}>
        {contactPreferenceLabels[project.contactPreference]}
        {project.phone ? ` · ${project.phone}` : ''}
      </Detail>
      {project.notes && (
        <Detail term="Notes">
          <span className="whitespace-pre-line">{project.notes}</span>
        </Detail>
      )}
    </DetailList>
  );
}
