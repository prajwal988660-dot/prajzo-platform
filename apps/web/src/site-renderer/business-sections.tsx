import type { Section, ServiceIcon } from '@prajzo/shared';
import {
  BadgeCheck,
  Brush,
  Clock,
  CreditCard,
  Flag,
  Leaf,
  Phone,
  Printer,
  ShieldCheck,
  Signpost,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { useSite } from './context';
import { SectionShell, SiteAction, SiteImageTag } from './parts';

/** Sections first used by the Business demo (Phase 10); any template may use them. */

type Props<T extends Section['type']> = { section: Extract<Section, { type: T }> };

const icons: Record<ServiceIcon, LucideIcon> = {
  sparkles: Sparkles,
  sign: Signpost,
  card: CreditCard,
  banner: Flag,
  printer: Printer,
  brush: Brush,
  truck: Truck,
  clock: Clock,
  shield: ShieldCheck,
  star: Star,
  phone: Phone,
  leaf: Leaf,
};

export function ServicesSection({ section }: Props<'services'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
      <ul className="ps-services">
        {content.items.map((service) => {
          const Icon = icons[service.icon];
          return (
            <li key={service.id} className="ps-service">
              <span className="ps-service-icon" aria-hidden="true">
                <Icon className="size-5" />
              </span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              {service.priceNote ? <p className="ps-price-note">{service.priceNote}</p> : null}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

export function HighlightsSection({ section }: Props<'highlights'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
      <ul className="ps-highlights">
        {content.items.map((highlight) => (
          <li key={highlight.id}>
            <BadgeCheck aria-hidden="true" className="ps-highlight-mark" />
            <h3>{highlight.title}</h3>
            <p>{highlight.text}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function GallerySection({ section }: Props<'gallery'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
      <ul className="ps-gallery">
        {content.items.map((picture) => (
          <li key={picture.id}>
            <figure>
              <SiteImageTag image={picture.image} className="ps-gallery-image" />
              {picture.caption ? <figcaption>{picture.caption}</figcaption> : null}
            </figure>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/** On a live demo every review says it is a sample (D-014): nobody really wrote it. */
export function TestimonialsSection({ section }: Props<'testimonials'>) {
  const { mode } = useSite();
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      <ul className="ps-quotes">
        {content.items.map((review) => (
          <li key={review.id}>
            <figure className="ps-quote">
              {mode === 'demo' ? <p className="ps-sample">Sample review</p> : null}
              <blockquote>
                <p>“{review.quote}”</p>
              </blockquote>
              <figcaption>
                {review.name}
                {review.role ? <span>, {review.role}</span> : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function CtaSection({ section }: Props<'cta'>) {
  const { content } = section;
  return (
    <section className="ps-inner ps-cta-wrap" aria-labelledby={`${section.id}-heading`}>
      <div className="ps-cta">
        <div>
          <h2 id={`${section.id}-heading`}>{content.heading}</h2>
          {content.text ? <p>{content.text}</p> : null}
        </div>
        <SiteAction link={content.action} variant="light" />
      </div>
    </section>
  );
}
