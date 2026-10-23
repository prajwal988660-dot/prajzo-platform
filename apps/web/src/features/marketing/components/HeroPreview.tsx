import { Check } from 'lucide-react';

/**
 * Illustration for the home page hero: a website preview with a customization panel.
 * Purely decorative, so it is hidden from screen readers.
 */
export function HeroPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-xl select-none lg:max-w-none">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(closest-side,rgb(54_76_221/0.16),transparent)]" />

      {/* Browser window */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="size-2.5 rounded-full bg-rose-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 flex-1 truncate rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
            yourbusiness.com
          </span>
        </div>

        {/* The previewed website */}
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="h-3 w-20 rounded-full bg-ink" />
            <span className="flex gap-2">
              <span className="h-2 w-8 rounded-full bg-slate-200" />
              <span className="h-2 w-8 rounded-full bg-slate-200" />
              <span className="h-2 w-8 rounded-full bg-slate-200" />
            </span>
          </div>
          <div className="mt-6 grid grid-cols-5 gap-4">
            <div className="col-span-3 space-y-2.5">
              <span className="block h-3 w-11/12 rounded-full bg-ink/85" />
              <span className="block h-3 w-8/12 rounded-full bg-ink/85" />
              <span className="block h-2 w-full rounded-full bg-slate-200" />
              <span className="block h-2 w-10/12 rounded-full bg-slate-200" />
              <span className="mt-3 inline-block h-6 w-24 rounded-full bg-brand-indigo" />
            </div>
            <div className="col-span-2 rounded-xl bg-linear-to-br from-brand-cyan via-brand-blue to-brand-violet opacity-90" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {['bg-indigo-50', 'bg-sky-50', 'bg-fuchsia-50'].map((tint) => (
              <div key={tint} className={`rounded-xl ${tint} p-3`}>
                <span className="block size-5 rounded-md bg-white shadow-sm" />
                <span className="mt-3 block h-2 w-10/12 rounded-full bg-slate-300/70" />
                <span className="mt-1.5 block h-2 w-7/12 rounded-full bg-slate-300/70" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customization panel */}
      <div className="absolute -bottom-8 -right-3 w-52 rounded-2xl border border-slate-200 bg-white p-4 shadow-lift sm:-right-8 sm:w-56">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customize</p>
        <p className="mt-3 text-[11px] font-medium text-slate-600">Brand colour</p>
        <div className="mt-1.5 flex gap-1.5">
          {[
            'bg-brand-indigo',
            'bg-brand-blue',
            'bg-brand-cyan',
            'bg-brand-violet',
            'bg-brand-magenta',
          ].map((colour, index) => (
            <span
              key={colour}
              className={`size-5 rounded-full ${colour} ${index === 0 ? 'ring-2 ring-ink ring-offset-2' : ''}`}
            />
          ))}
        </div>
        <ul className="mt-4 grid gap-2 text-[12px] text-slate-700">
          {['Contact form', 'WhatsApp button', 'Photo gallery'].map((feature) => (
            <li key={feature} className="flex items-center justify-between">
              {feature}
              <span className="grid size-4 place-items-center rounded bg-emerald-600 text-white">
                <Check className="size-3" />
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Phone preview */}
      <div className="absolute -bottom-10 -left-4 hidden w-24 rounded-2xl border-4 border-ink bg-white p-2 shadow-lift sm:block">
        <span className="block h-2 w-10 rounded-full bg-ink" />
        <span className="mt-2 block h-10 rounded-lg bg-linear-to-br from-brand-cyan via-brand-blue to-brand-violet" />
        <span className="mt-2 block h-1.5 w-full rounded-full bg-slate-200" />
        <span className="mt-1 block h-1.5 w-8/12 rounded-full bg-slate-200" />
        <span className="mt-2 block h-3 w-12 rounded-full bg-brand-indigo" />
      </div>
    </div>
  );
}
