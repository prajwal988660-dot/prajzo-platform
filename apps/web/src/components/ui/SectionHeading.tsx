import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  as: Heading = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cx('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-indigo">
          {eyebrow}
        </p>
      )}
      <Heading
        className={cx('text-3xl font-semibold tracking-tight sm:text-4xl', eyebrow ? 'mt-3' : null)}
      >
        {title}
      </Heading>
      {description && <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>}
    </div>
  );
}
