import { templateListResponseSchema } from '@prajzo/shared';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { useApi } from '../../lib/use-api';
import { usePageMeta } from '../../lib/use-page-meta';
import { CallToActionBand } from '../marketing/components/CallToActionBand';
import { PageIntro } from '../marketing/components/PageIntro';
import { TemplateCard } from './TemplateCard';

/** Templates and Live Demos (/templates): every published template, each with a working demo. */
export function TemplatesPage() {
  usePageMeta('/templates');
  const templates = useApi('/v1/templates', templateListResponseSchema);

  return (
    <>
      <PageIntro eyebrow="Templates and Live Demos" title="See a design working before you choose">
        <p>
          Each template is a complete website you can try: open the live demo, click around, and
          send its contact form. Everyone in the demos is made up.
        </p>
      </PageIntro>

      <section aria-label="Templates" className="py-14 sm:py-20">
        <Container>
          {templates.status === 'loading' && (
            <LoadingBlock label="Loading templates" className="min-h-[60svh]" />
          )}
          {templates.status === 'error' && (
            <LoadError message={templates.error.message} onRetry={templates.retry} />
          )}
          {templates.status === 'success' && templates.data.items.length === 0 && (
            <EmptyState
              title="Templates are being updated"
              description="No template is available right now. Tell us what you need and we'll design it for you."
              action={<ButtonLink to="/start-project">Start a project</ButtonLink>}
            />
          )}
          {templates.status === 'success' && templates.data.items.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templates.data.items.map((template) => (
                <TemplateCard key={template.key} template={template} />
              ))}
            </div>
          )}
          <p className="mt-10 max-w-3xl text-sm leading-relaxed text-slate-600">
            More designs are being built: business, events and colleges, online catalogues, and
            forms and bookings. Every website we build is designed for you, whether or not a
            template fits.
          </p>
        </Container>
      </section>

      <CallToActionBand
        title="Don't see your kind of website?"
        text="Tell us what you need. We design and build websites of every kind, not only these."
      />
    </>
  );
}
