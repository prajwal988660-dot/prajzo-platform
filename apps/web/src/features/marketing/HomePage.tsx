import { categoryListSchema, servicePackageListSchema } from '@prajzo/shared';
import { ArrowRight, Check, Layers, Palette, Puzzle, Type } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { usePageTitle } from '../../lib/use-page-title';
import { useApi } from '../../lib/use-api';
import { CallToActionBand } from './components/CallToActionBand';
import { CategoryCard } from './components/CategoryCard';
import { DeliveryHighlights } from './components/DeliveryHighlights';
import { FaqList } from './components/FaqList';
import { HeroPreview } from './components/HeroPreview';
import { PackageCard } from './components/PackageCard';
import { ProcessSteps } from './components/ProcessSteps';
import { customizationOptions, generalFaqs, reasonsToChoose } from './content';

const customizationIcons = [Layers, Palette, Type, Puzzle] as const;

export function HomePage() {
  usePageTitle();
  return (
    <>
      <Hero />

      <section aria-labelledby="delivery-heading" className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Delivery targets"
            id="delivery-heading"
            title="Fast, with clear conditions"
            description="Most websites don't need to take months. These are our targets once your scope and content are ready."
          />
          <div className="mt-10">
            <DeliveryHighlights />
          </div>
        </Container>
      </section>

      <CategoriesPreview />

      <section aria-labelledby="process-heading" className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="How it works"
            id="process-heading"
            title="From idea to launch in five steps"
            description="You always know what happens next, what it costs and when it will be ready."
          />
          <div className="mt-10">
            <ProcessSteps />
          </div>
          <ButtonLink to="/how-it-works" variant="secondary" className="mt-8">
            See how it works in detail
          </ButtonLink>
        </Container>
      </section>

      <section aria-labelledby="customize-heading" className="bg-surface py-16 sm:py-20">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Make it yours"
            id="customize-heading"
            title="Customize every detail"
            description="Every Prajzo website is shaped around you. Start from a proven layout, then decide the pages, look, content and features."
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {customizationOptions.map((option, index) => {
              const Icon = customizationIcons[index] ?? Layers;
              return (
                <li
                  key={option.title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card"
                >
                  <Icon aria-hidden="true" className="size-6 text-brand-indigo" />
                  <h3 className="mt-3 font-semibold">{option.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">
                    {option.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <PackagesPreview />

      <section aria-labelledby="why-heading" className="bg-surface py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Why Prajzo"
            id="why-heading"
            title="A studio that keeps things simple"
          />
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {reasonsToChoose.map((reason) => (
              <li key={reason.title} className="flex gap-4">
                <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <Check aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <h3 className="font-semibold">{reason.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">
                    {reason.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="faq-heading" className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading
            eyebrow="Questions"
            id="faq-heading"
            title="Frequently asked questions"
            description="Can't find your answer? Ask us on WhatsApp or through the contact form."
          />
          <FaqList faqs={generalFaqs} />
        </Container>
      </section>

      <CallToActionBand />
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(56rem_28rem_at_85%_-8%,rgb(54_76_221/0.12),transparent_62%),radial-gradient(40rem_24rem_at_0%_0%,rgb(4_187_255/0.10),transparent_60%)]"
      />
      <Container className="grid items-center gap-16 pb-24 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_1fr] lg:pb-32">
        <div>
          <Badge tone="brand">Web development studio</Badge>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Your Idea. Your Design. <span className="text-brand-gradient">Our Development.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
            Explore website templates, customize your content, choose your features, and let Prajzo
            bring your digital vision to life.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink to="/start-project" size="lg">
              Start a Project <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink to="/services" variant="secondary" size="lg">
              View services
            </ButtonLink>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {[
              'Published starting prices',
              'Delivery targets from 24 hours',
              'Mobile-friendly by default',
            ].map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check aria-hidden="true" className="size-4 text-emerald-600" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <HeroPreview />
      </Container>
    </section>
  );
}

function CategoriesPreview() {
  const categories = useApi('/v1/categories', categoryListSchema);
  return (
    <section aria-labelledby="categories-heading" className="bg-surface py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="What we build"
          id="categories-heading"
          title="Websites for every need"
          description="From a one-page registration form to a full web application with dashboards."
        />
        <div className="mt-10">
          {categories.status === 'loading' && <LoadingBlock label="Loading services" />}
          {categories.status === 'error' && (
            <LoadError message={categories.error.message} onRetry={categories.retry} />
          )}
          {categories.status === 'success' && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.data.items.slice(0, 8).map((category) => (
                  <CategoryCard key={category.key} category={category} />
                ))}
              </div>
              <ButtonLink to="/services" variant="secondary" className="mt-8">
                See all {categories.data.items.length} services
              </ButtonLink>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}

function PackagesPreview() {
  const packages = useApi('/v1/packages', servicePackageListSchema);
  return (
    <section aria-labelledby="packages-heading" className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Packages"
          id="packages-heading"
          title="Simple, affordable starting prices"
          description="Pick the package that fits. Your final price is confirmed in a quote before any work starts."
        />
        <div className="mt-12">
          {packages.status === 'loading' && <LoadingBlock label="Loading packages" />}
          {packages.status === 'error' && (
            <LoadError message={packages.error.message} onRetry={packages.retry} />
          )}
          {packages.status === 'success' && (
            <div className="grid gap-6 lg:grid-cols-3">
              {packages.data.items.map((servicePackage) => (
                <PackageCard
                  key={servicePackage.key}
                  servicePackage={servicePackage}
                  highlighted={servicePackage.key === 'professional-website'}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
