import { deliveryConditions, servicePackageListSchema } from '@prajzo/shared';
import { Info } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { usePageMeta } from '../../lib/use-page-meta';
import { useApi } from '../../lib/use-api';
import { CallToActionBand } from './components/CallToActionBand';
import { FaqList } from './components/FaqList';
import { PackageCard } from './components/PackageCard';
import { PageIntro } from './components/PageIntro';
import { pricingFaqs } from './content';

export function PricingPage() {
  usePageMeta('/pricing');
  const packages = useApi('/v1/packages', servicePackageListSchema);

  return (
    <>
      <PageIntro eyebrow="Pricing and plans" title="Affordable prices, agreed up front">
        <p>
          Three packages with published starting prices. You get a clear quote with the final price
          and delivery date before any work begins.
        </p>
      </PageIntro>

      <section aria-label="Packages" className="py-14 sm:py-20">
        <Container>
          {/* Tall enough that what follows starts below the screen, so it can't be seen jumping. */}
          {packages.status === 'loading' && (
            <LoadingBlock label="Loading packages" className="min-h-[70svh]" />
          )}
          {packages.status === 'error' && (
            <LoadError message={packages.error.message} onRetry={packages.retry} />
          )}
          {packages.status === 'success' && packages.data.items.length === 0 && (
            <EmptyState
              title="Prices are being updated"
              description="Tell us what you need and we'll send you a quote."
              action={<ButtonLink to="/contact">Request a quote</ButtonLink>}
            />
          )}
          {packages.status === 'success' && packages.data.items.length > 0 && (
            <div className="grid gap-6 pt-3 lg:grid-cols-3">
              {packages.data.items.map((servicePackage) => (
                <PackageCard
                  key={servicePackage.key}
                  servicePackage={servicePackage}
                  highlighted={servicePackage.key === 'professional-website'}
                  headingLevel={2}
                />
              ))}
            </div>
          )}

          <div className="mt-10 flex gap-3 rounded-2xl border border-slate-200 bg-surface p-5 text-sm leading-relaxed text-slate-700">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-indigo" />
            <p>
              Prices are starting prices in Indian Rupees. Your quote shows the final price, any
              applicable taxes, and domain or hosting costs if you need them. {deliveryConditions}
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="pricing-faq-heading" className="bg-surface py-14 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading
            id="pricing-faq-heading"
            eyebrow="Questions"
            title="About pricing"
            description="Anything else? Ask us. We're happy to explain a quote line by line."
          />
          <FaqList faqs={pricingFaqs} />
        </Container>
      </section>

      <CallToActionBand
        title="Get your free quote"
        text="Tell us about your project and we'll reply with the scope, price and delivery date."
      />
    </>
  );
}
