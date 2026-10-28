import { templateListResponseSchema } from '@prajzo/shared';
import { Check } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { useApi } from '../../lib/use-api';
import { usePageMeta } from '../../lib/use-page-meta';
import { CallToActionBand } from '../marketing/components/CallToActionBand';
import { PageIntro } from '../marketing/components/PageIntro';

/**
 * Our Projects (/projects). Each live demo shown as a case study, and labelled plainly as a
 * demonstration: Prajzo never presents made-up work as a client's.
 */
export function ProjectsPage() {
  usePageMeta('/projects');
  const templates = useApi('/v1/templates', templateListResponseSchema);

  return (
    <>
      <PageIntro eyebrow="Our Projects" title="Demonstration projects you can try">
        <p>
          These are working websites we built to show how we work. The people and businesses in them
          are made up, so you can click everything and send their forms.
        </p>
      </PageIntro>

      <section aria-label="Demonstration projects" className="py-14 sm:py-20">
        <Container className="grid gap-10">
          {templates.status === 'loading' && (
            <LoadingBlock label="Loading projects" className="min-h-[60svh]" />
          )}
          {templates.status === 'error' && (
            <LoadError message={templates.error.message} onRetry={templates.retry} />
          )}
          {templates.status === 'success' && templates.data.items.length === 0 && (
            <EmptyState
              title="Projects are being updated"
              description="Nothing to show right now. Tell us about your project and we'll show you similar work."
              action={<ButtonLink to="/contact">Contact us</ButtonLink>}
            />
          )}
          {templates.status === 'success' &&
            templates.data.items.map((template) => (
              <article
                key={template.key}
                aria-labelledby={`project-${template.key}`}
                className="grid gap-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8 lg:grid-cols-[1.1fr_1fr]"
              >
                <img
                  src={template.previewImage.src}
                  alt={template.previewImage.alt}
                  width={960}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[8/5] w-full rounded-xl border border-slate-200/80 object-cover object-top"
                />
                <div className="grid content-start gap-4">
                  <Badge tone="warning" className="justify-self-start">
                    Demonstration project, not a client
                  </Badge>
                  <h2 id={`project-${template.key}`} className="text-2xl font-semibold">
                    {template.name} website
                  </h2>
                  <p className="leading-relaxed text-slate-600">{template.description}</p>
                  <h3 className="font-semibold">What we built</h3>
                  <ul className="grid gap-1.5 text-sm text-slate-700">
                    {template.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-emerald-600"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <ButtonLink
                      to={template.demoPath}
                      aria-label={`View Live Demo of the ${template.name} website`}
                    >
                      View Live Demo
                    </ButtonLink>
                    <ButtonLink
                      to={`/templates/${template.key}`}
                      variant="secondary"
                      aria-label={`About the template for the ${template.name} website`}
                    >
                      About the template
                    </ButtonLink>
                  </div>
                </div>
              </article>
            ))}
        </Container>
      </section>

      <CallToActionBand
        title="Want a website like these?"
        text="Tell us about your business and we'll build one designed for you."
      />
    </>
  );
}
