import type { ReactNode } from 'react';
import { Container } from '../../../components/layout/Container';

/** The heading area at the top of inner pages. */
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200/70 bg-surface">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(48rem_20rem_at_90%_0%,rgb(54_76_221/0.10),transparent_65%)]"
      />
      <Container className="py-14 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-indigo">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {children && (
          <div className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{children}</div>
        )}
      </Container>
    </section>
  );
}
