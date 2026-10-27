import { deliveryTierLabels, type Category } from '@prajzo/shared';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '../../../components/ui/Badge';
import { cx } from '../../../lib/cx';
import { CategoryIcon } from './CategoryIcon';

type CategoryCardProps = {
  category: Category;
  /** Shows the use cases and delivery category (Services page). */
  detailed?: boolean;
  className?: string;
  /** 2 when the page has no section heading above the cards (the Services page), 3 when it has. */
  headingLevel?: 2 | 3;
};

export function CategoryCard({
  category,
  detailed = false,
  className,
  headingLevel = 3,
}: CategoryCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const tier = deliveryTierLabels[category.deliveryTier];
  return (
    <article
      className={cx(
        'flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-brand-indigo">
        <CategoryIcon name={category.icon} className="size-5" />
      </span>
      <Heading className="mt-4 text-lg font-semibold leading-snug">{category.title}</Heading>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-600">{category.description}</p>

      {detailed && (
        <>
          <ul className="mt-4 grid gap-1.5 text-sm text-slate-700">
            {category.useCases.map((useCase) => (
              <li key={useCase} className="flex gap-2">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                {useCase}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="brand">{tier.name}</Badge>
            <Badge>{tier.target}</Badge>
          </div>
        </>
      )}

      <div className="mt-auto pt-5">
        <Link
          to={`/start-project?type=${encodeURIComponent(category.key)}`}
          className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-brand-indigo hover:underline focus-visible:outline-2 focus-visible:outline-brand-blue"
        >
          Start a project
          <span className="sr-only">: {category.title}</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  );
}
