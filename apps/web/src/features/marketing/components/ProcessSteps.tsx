import { processSteps } from '../content';

export function ProcessSteps() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {processSteps.map((step, index) => (
        <li
          key={step.title}
          className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full bg-ink font-display text-sm font-semibold text-white"
          >
            {index + 1}
          </span>
          <h3 className="mt-4 text-lg font-semibold">
            <span className="sr-only">Step {index + 1}: </span>
            {step.title}
          </h3>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
