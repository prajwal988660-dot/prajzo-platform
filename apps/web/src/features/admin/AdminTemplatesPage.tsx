import { adminTemplateListSchema } from '@prajzo/shared';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';

/** Every template and its catalogue listing (D-005), with links to edit it and to its demo. */
export function AdminTemplatesPage() {
  usePageTitle('Templates');
  const templates = useApi('/v1/admin/templates', adminTemplateListSchema);
  const location = useLocation();
  const navigate = useNavigate();
  // A form that has just saved sends the admin back here with a message; keep it on screen
  // once, and don't show it again on reload.
  const [saved] = useState(() => (location.state as { saved?: string } | null)?.saved);
  useEffect(() => {
    if (saved) void navigate('.', { replace: true, state: null });
  }, [saved, navigate]);

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        What the Templates pages say about each design, and whether it is shown. Messages sent from
        the live demos are in{' '}
        <Link to="/admin/demo-messages" className="font-medium text-brand-indigo underline">
          Demo messages
        </Link>
        .
      </p>
      {saved && (
        <Alert tone="success" title="Saved" className="mt-6">
          {saved}
        </Alert>
      )}
      <div className="mt-8">
        {templates.status === 'loading' && <LoadingBlock label="Loading templates" />}
        {templates.status === 'error' && (
          <LoadError message={templates.error.message} onRetry={templates.retry} />
        )}
        {templates.status === 'success' && (
          <ul className="grid gap-4">
            {templates.data.items.map((template) => (
              <li key={template.key}>
                <Card className="grid gap-5 sm:grid-cols-[12rem_1fr]">
                  <img
                    src={template.previewImage.src}
                    alt=""
                    width={960}
                    height={600}
                    className="aspect-[8/5] w-full rounded-lg border border-slate-200 object-cover object-top"
                  />
                  <div className="grid content-start gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{template.name}</h2>
                      <Badge tone={template.published ? 'success' : 'neutral'}>
                        {template.published ? 'Shown' : 'Hidden'}
                      </Badge>
                      {template.featured ? <Badge tone="brand">Featured</Badge> : null}
                    </div>
                    <p className="text-sm text-slate-600">{template.tagline}</p>
                    <p className="text-sm text-slate-600">
                      Order {template.order} · Last changed{' '}
                      <time dateTime={template.updatedAt}>
                        {formatDateTime(template.updatedAt)}
                      </time>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <ButtonLink
                        to={`/admin/templates/${template.key}`}
                        size="sm"
                        aria-label={`Edit the ${template.name} listing`}
                      >
                        Edit listing
                      </ButtonLink>
                      <ButtonLink
                        to={template.demoPath}
                        size="sm"
                        variant="secondary"
                        aria-label={`Open the ${template.name} live demo`}
                      >
                        Open live demo
                      </ButtonLink>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
