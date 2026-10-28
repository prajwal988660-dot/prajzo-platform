import type { Section, SiteImage, SiteLink } from '@prajzo/shared';
import type { ReactNode } from 'react';
import { useSite } from './context';
import { DemoAction } from './DemoAction';

/** The pieces every kind of section is made of. */

export function SiteImageTag({ image, className }: { image: SiteImage; className?: string }) {
  return (
    <img
      className={className}
      src={image.src}
      alt={image.decorative ? '' : image.alt}
      loading="lazy"
      decoding="async"
    />
  );
}

/** A link inside the site: in-page links work everywhere; others never leave a demo. */
export function SiteAction({
  link,
  variant,
}: {
  link: SiteLink;
  variant: 'primary' | 'secondary' | 'light' | 'outline-light';
}) {
  const { mode } = useSite();
  const className = `ps-button ps-button-${variant}`;
  if (link.href.startsWith('#') || mode !== 'demo') {
    return (
      <a className={className} href={link.href.startsWith('#') ? link.href : undefined}>
        {link.label}
      </a>
    );
  }
  return (
    <DemoAction className={className} note={`On the real website, this opens ${link.href}.`}>
      {link.label}
    </DemoAction>
  );
}

/** A section with its heading, which the navigation can link to. */
export function SectionShell({
  section,
  heading,
  children,
}: {
  section: Section;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section
      id={section.id}
      className={`ps-section ps-section-${section.type} ps-inner`}
      data-variant={section.variant}
      aria-labelledby={`${section.id}-heading`}
    >
      <h2 id={`${section.id}-heading`}>{heading}</h2>
      {children}
    </section>
  );
}
