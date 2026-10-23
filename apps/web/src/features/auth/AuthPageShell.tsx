import type { ReactNode } from 'react';
import { Container } from '../../components/layout/Container';

/** A centered card for sign-in, sign-up and password pages. */
export function AuthPageShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-surface">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(48rem_20rem_at_90%_0%,rgb(54_76_221/0.10),transparent_65%)]"
      />
      <Container className="flex justify-center py-14 sm:py-20">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {intro && <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-600">{intro}</p>}
          <div className="mt-7">{children}</div>
          {footer && (
            <div className="mt-7 border-t border-slate-100 pt-6 text-sm text-slate-600">
              {footer}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
