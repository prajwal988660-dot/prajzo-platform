import type { TemplateEntry } from '@prajzo/shared';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';

/** One template on the Templates page: its preview, what it is for, and its live demo. */
export function TemplateCard({
  template,
  headingLevel = 2,
}: {
  template: TemplateEntry;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <img
        src={template.previewImage.src}
        alt={template.previewImage.alt}
        width={960}
        height={600}
        loading="lazy"
        decoding="async"
        className="aspect-[8/5] w-full border-b border-slate-200/80 bg-surface object-cover object-top"
      />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Heading className="text-xl font-semibold">{template.name}</Heading>
          {template.featured ? <Badge tone="brand">Featured</Badge> : null}
        </div>
        <p className="mt-2 leading-relaxed text-slate-600">{template.tagline}</p>
        {template.categories.length ? (
          <p className="mt-3 text-sm text-slate-600">
            <span className="font-semibold text-ink">Suits: </span>
            {template.categories.map((category) => category.title).join(', ')}
          </p>
        ) : null}
        <ul className="mt-4 grid gap-1.5 text-sm text-slate-700">
          {template.features.slice(0, 4).map((feature) => (
            <li key={feature} className="flex gap-2">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
          {/* The label starts with the visible words, so "click View Live Demo" works by voice. */}
          <ButtonLink
            to={template.demoPath}
            aria-label={`View Live Demo of the ${template.name} template`}
          >
            View Live Demo
          </ButtonLink>
          <Link
            to={`/templates/${template.key}`}
            aria-label={`Details of the ${template.name} template`}
            className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-brand-indigo hover:underline focus-visible:outline-2 focus-visible:outline-brand-blue"
          >
            Details
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
