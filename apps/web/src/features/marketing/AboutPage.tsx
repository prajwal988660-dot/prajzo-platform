import { Gauge, HeartHandshake, MessagesSquare, ShieldCheck } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { usePageMeta } from '../../lib/use-page-meta';
import { CallToActionBand } from './components/CallToActionBand';
import { PageIntro } from './components/PageIntro';

const values = [
  {
    icon: MessagesSquare,
    title: 'Clarity',
    text: 'Plain language, clear quotes and delivery dates you can plan around.',
  },
  {
    icon: ShieldCheck,
    title: 'Quality',
    text: 'Fast, secure, accessible websites that work properly on every screen.',
  },
  {
    icon: Gauge,
    title: 'Speed with care',
    text: 'Quick delivery for well-defined projects, without cutting corners.',
  },
  {
    icon: HeartHandshake,
    title: 'Honesty',
    text: "We tell you what's possible, what it costs and what it doesn't need.",
  },
] as const;

export function AboutPage() {
  usePageMeta('/about');
  return (
    <>
      <PageIntro eyebrow="About us" title="We build websites that work for you">
        <p>
          Prajzo is a web development studio. We design and build websites, web applications and
          digital solutions for businesses, institutions and individuals.
        </p>
      </PageIntro>

      <section aria-labelledby="story-heading" className="py-14 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2">
          <SectionHeading
            id="story-heading"
            eyebrow="Why we exist"
            title="Good websites shouldn't be complicated"
          />
          <div className="grid gap-4 text-lg leading-8 text-slate-600">
            <p>
              Many people put off getting a website because the process feels slow, expensive and
              confusing. We started Prajzo to change that.
            </p>
            <p>
              Whether you need a single registration page or a full web application, we explain the
              options, agree the price and delivery date up front, and keep you updated while we
              build.
            </p>
            <p>
              Small businesses, colleges, event organisers and individuals deserve the same care as
              big companies, at prices that make sense.
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="values-heading" className="bg-surface py-14 sm:py-20">
        <Container>
          <SectionHeading
            id="values-heading"
            eyebrow="What we value"
            title="How we work with you"
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card"
              >
                <Icon aria-hidden="true" className="size-6 text-brand-indigo" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink to="/services" variant="secondary">
              See what we build
            </ButtonLink>
            <ButtonLink to="/how-it-works" variant="secondary">
              How a project works
            </ButtonLink>
          </div>
        </Container>
      </section>

      <CallToActionBand />
    </>
  );
}
