import { deliveryConditions } from '@prajzo/shared';
import { Rocket, Timer, Zap } from 'lucide-react';

const highlights = [
  {
    icon: Zap,
    target: 'Within 24 hours',
    title: 'Small projects',
    text: 'Single pages, landing pages, simple forms and portfolios.',
  },
  {
    icon: Timer,
    target: 'Within 3 days',
    title: 'Professional websites',
    text: 'Multi-page websites for businesses, portfolios and events.',
  },
  {
    icon: Rocket,
    target: 'Within 7 days',
    title: 'Eligible advanced projects',
    text: 'Clearly scoped apps with data, sign-in, dashboards or bookings.',
  },
] as const;

export function DeliveryHighlights() {
  return (
    <div>
      <ul className="grid gap-4 md:grid-cols-3">
        {highlights.map(({ icon: Icon, target, title, text }) => (
          <li
            key={title}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-brand-indigo">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-indigo">
                Target: {target}
              </p>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">{text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-600">{deliveryConditions}</p>
    </div>
  );
}
