import { ChevronDown } from 'lucide-react';
import type { Faq } from '../content';

/** Questions that open and close on click or Enter (native <details>, so no script is needed). */
export function FaqList({ faqs }: { faqs: readonly Faq[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {faqs.map((faq) => (
        <details
          key={faq.question}
          className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
            {faq.question}
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="mt-3 leading-relaxed text-slate-600">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
