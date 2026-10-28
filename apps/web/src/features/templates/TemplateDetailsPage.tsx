import { templateResponseSchema, type SitePagePath, type TemplateKey } from '@prajzo/shared';
import { Check } from 'lucide-react';
import { Link } from 'react-router';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { useApi } from '../../lib/use-api';
import { usePageMeta } from '../../lib/use-page-meta';
import { NotFoundPage } from '../system/NotFoundPage';

/** One template (/templates/:key): what it includes, its preview, and its live demo. */
export function TemplateDetailsPage({ templateKey }: { templateKey: TemplateKey }) {
  usePageMeta(`/templates/${templateKey}` as SitePagePath);
  const result = useApi(`/v1/templates/${templateKey}`, templateResponseSchema);

  if (result.status === 'loading') {
    return (
      <Container className="py-20">
        <LoadingBlock label="Loading the template" className="min-h-[60svh]" />
      </Container>
    );
  }
  if (result.status === 'error') {
    if (result.error.status === 404) return <NotFoundPage />;
    return (
      <Container className="py-20">
        <LoadError message={result.error.message} onRetry={result.retry} />
      </Container>
    );
  }

  const { template } = result.data;
  return (
    <>
      <section className="border-b border-slate-200/70 bg-surface">
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-indigo">
              <Link to="/templates" className="rounded hover:underline">
                Templates
              </Link>
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {template.name}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">{template.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to={template.demoPath}>View Live Demo</ButtonLink>
              <ButtonLink to={`/build?template=${template.key}`} variant="secondary">
                Customize This Design
              </ButtonLink>
              <ButtonLink to="/start-project" variant="secondary">
                Start a project with this design
              </ButtonLink>
            </div>
          </div>
          <img
            src={template.previewImage.src}
            alt={template.previewImage.alt}
            width={960}
            height={600}
            className="aspect-[8/5] w-full rounded-2xl border border-slate-200/80 bg-white object-cover object-top shadow-lift"
          />
        </Container>
      </section>

      <section className="py-14 sm:py-20" aria-labelledby="about-template">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 id="about-template" className="text-2xl font-semibold">
              About this template
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">{template.description}</p>
            {template.categories.length ? (
              <>
                <h3 className="mt-8 text-lg font-semibold">Suits</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {template.categories.map((category) => (
                    <li key={category.key}>
                      <Link
                        to={`/start-project?type=${encodeURIComponent(category.key)}`}
                        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-ink hover:border-brand-indigo focus-visible:outline-2 focus-visible:outline-brand-blue"
                      >
                        {category.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div>
            <h2 className="text-2xl font-semibold">What it includes</h2>
            <ul className="mt-4 grid gap-2.5 text-slate-700">
              {template.features.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-emerald-600" />
                  {feature}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm leading-relaxed text-slate-600">
              Your website is built for you: your words, pictures, colours and any changes you need.
              The demo shows a made-up person.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
