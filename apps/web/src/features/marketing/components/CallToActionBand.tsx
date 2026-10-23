import { siteLinks } from '@prajzo/shared';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Container } from '../../../components/layout/Container';
import { ButtonLink } from '../../../components/ui/Button';

export function CallToActionBand({
  title = "Have an idea? Let's build it.",
  text = "Tell us what you need. We'll reply with a clear plan, a price and a delivery date.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl bg-ink px-6 py-14 text-center shadow-lift sm:px-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_18rem_at_50%_-20%,rgb(54_76_221/0.55),transparent_70%)]"
          />
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-indigo-100">{text}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/contact" variant="secondary" size="lg">
              Start a Project <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <a
              href={siteLinks.whatsapp("Hi Prajzo! I'd like to talk about a website.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 px-7 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <MessageCircle aria-hidden="true" className="size-5" />
              Chat on WhatsApp
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
