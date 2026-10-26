import { CircleCheck } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { usePageMeta } from '../../lib/use-page-meta';
import { CallToActionBand } from './components/CallToActionBand';
import { DeliveryHighlights } from './components/DeliveryHighlights';
import { PageIntro } from './components/PageIntro';
import { ProcessSteps } from './components/ProcessSteps';
import { contentChecklist } from './content';

export function HowItWorksPage() {
  usePageMeta('/how-it-works');
  return (
    <>
      <PageIntro eyebrow="How it works" title="A clear path from idea to launch">
        <p>
          You'll always know what happens next, what it costs and when it will be ready. Here's how
          a project with Prajzo runs.
        </p>
      </PageIntro>

      <section aria-labelledby="steps-heading" className="py-14 sm:py-20">
        <Container>
          <SectionHeading
            id="steps-heading"
            eyebrow="The process"
            title="Five steps, no surprises"
          />
          <div className="mt-10">
            <ProcessSteps />
          </div>
        </Container>
      </section>

      <section aria-labelledby="needs-heading" className="bg-surface py-14 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2">
          <SectionHeading
            id="needs-heading"
            eyebrow="Before we start"
            title="What we need from you"
            description="Having these ready is the biggest thing that speeds up delivery. Missing something? We'll help you plan it."
          />
          <ul className="grid gap-3">
            {contentChecklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card"
              >
                <CircleCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-emerald-600"
                />
                <span className="text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="delivery-heading" className="py-14 sm:py-20">
        <Container>
          <SectionHeading
            id="delivery-heading"
            eyebrow="Delivery targets"
            title="How fast can it be ready?"
            description="Targets start once your scope is agreed and your content is ready."
          />
          <div className="mt-10">
            <DeliveryHighlights />
          </div>
        </Container>
      </section>

      <section aria-labelledby="after-heading" className="bg-surface py-14 sm:py-20">
        <Container className="max-w-3xl">
          <SectionHeading id="after-heading" eyebrow="After launch" title="We don't disappear" />
          <div className="mt-6 grid gap-4 text-lg leading-8 text-slate-600">
            <p>
              Once your website is live, you can reach us for questions, fixes and updates. If
              something we built doesn't work as agreed, we fix it.
            </p>
            <p>
              New pages, features or regular updates can be added any time. We quote them first, so
              you always know the cost before we start.
            </p>
          </div>
        </Container>
      </section>

      <CallToActionBand />
    </>
  );
}
