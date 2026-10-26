import { categoryListSchema, deliveryConditions } from '@prajzo/shared';
import { Container } from '../../components/layout/Container';
import { EmptyState } from '../../components/ui/EmptyState';
import { ButtonLink } from '../../components/ui/Button';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { usePageMeta } from '../../lib/use-page-meta';
import { useApi } from '../../lib/use-api';
import { CallToActionBand } from './components/CallToActionBand';
import { CategoryCard } from './components/CategoryCard';
import { PageIntro } from './components/PageIntro';

export function ServicesPage() {
  usePageMeta('/services');
  const categories = useApi('/v1/categories', categoryListSchema);

  return (
    <>
      <PageIntro eyebrow="Services" title="Websites and web apps for every need">
        <p>
          Choose the kind of website you need. Each one is designed for your business, works on
          every screen and is quoted clearly before we start.
        </p>
      </PageIntro>

      <section aria-label="Website categories" className="py-14 sm:py-20">
        <Container>
          {/* Tall enough that what follows starts below the screen, so it can't be seen jumping. */}
          {categories.status === 'loading' && (
            <LoadingBlock label="Loading services" className="min-h-[70svh]" />
          )}
          {categories.status === 'error' && (
            <LoadError message={categories.error.message} onRetry={categories.retry} />
          )}
          {categories.status === 'success' && categories.data.items.length === 0 && (
            <EmptyState
              title="Services are being updated"
              description="Our service list isn't available right now. Tell us what you need and we'll help."
              action={<ButtonLink to="/contact">Contact us</ButtonLink>}
            />
          )}
          {categories.status === 'success' && categories.data.items.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.data.items.map((category) => (
                <CategoryCard key={category.key} category={category} detailed headingLevel={2} />
              ))}
            </div>
          )}
          <p className="mt-10 max-w-3xl text-sm leading-relaxed text-slate-600">
            {deliveryConditions}
          </p>
        </Container>
      </section>

      <CallToActionBand
        title="Not sure which one you need?"
        text="Describe your idea in a few lines and we'll suggest the right kind of website."
      />
    </>
  );
}
