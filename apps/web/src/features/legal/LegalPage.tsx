import type { ReactNode } from 'react';
import { Container } from '../../components/layout/Container';
import { PageIntro } from '../marketing/components/PageIntro';

/** Layout for long text pages such as the privacy policy and terms. */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageIntro eyebrow={eyebrow} title={title}>
        <p>Last updated: {updated}</p>
      </PageIntro>
      <Container className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-10 text-[1.0625rem] leading-8 text-slate-700 [&_a]:font-medium [&_a]:text-brand-indigo [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </Container>
    </>
  );
}
