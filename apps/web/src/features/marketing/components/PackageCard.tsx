import { deliveryTierLabels, type ServicePackage } from '@prajzo/shared';
import { Check, Clock } from 'lucide-react';
import { ButtonLink } from '../../../components/ui/Button';
import { cx } from '../../../lib/cx';
import { describePrice } from '../../../lib/format';

type PackageCardProps = {
  servicePackage: ServicePackage;
  highlighted?: boolean;
  /** 2 when the page has no section heading above the cards (the Pricing page), 3 when it has. */
  headingLevel?: 2 | 3;
};

export function PackageCard({
  servicePackage,
  highlighted = false,
  headingLevel = 3,
}: PackageCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const price = describePrice(servicePackage);
  const tier = deliveryTierLabels[servicePackage.deliveryTier];

  return (
    <article
      className={cx(
        'relative flex flex-col rounded-3xl border bg-white p-7 shadow-card',
        highlighted ? 'border-brand-indigo/40 ring-1 ring-brand-indigo/20' : 'border-slate-200/80',
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-7 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
          Recommended
        </span>
      )}
      <Heading className="text-xl font-semibold">{servicePackage.name}</Heading>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-600">
        {servicePackage.summary}
      </p>

      <p className="mt-6">
        <span className="block text-sm font-medium text-slate-600">{price.label}</span>
        {price.amount && (
          <span className="font-display text-4xl font-semibold tracking-tight text-ink">
            {price.amount}
          </span>
        )}
      </p>

      <p className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Clock aria-hidden="true" className="size-4 text-brand-indigo" />
        {tier.target}
      </p>

      <ul className="mt-6 grid gap-2.5 border-t border-slate-100 pt-6 text-[0.9375rem] text-slate-700">
        {servicePackage.scope.map((item) => (
          <li key={item} className="flex gap-2.5">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>

      <ButtonLink
        to={`/start-project?package=${encodeURIComponent(servicePackage.key)}`}
        variant={highlighted ? 'primary' : 'secondary'}
        className="mt-8 w-full"
      >
        Get a quote<span className="sr-only"> for {servicePackage.name}</span>
      </ButtonLink>
    </article>
  );
}
