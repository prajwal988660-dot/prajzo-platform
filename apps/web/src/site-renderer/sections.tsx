import { type Section, type WebsiteConfig } from '@prajzo/shared';
import { useId, useState } from 'react';
import {
  CtaSection,
  GallerySection,
  HighlightsSection,
  ServicesSection,
  TestimonialsSection,
} from './business-sections';
import { EnquirySection, ProductsSection } from './catalogue-sections';
import { useSite } from './context';
import {
  FactsSection,
  GuidelinesSection,
  RegistrationSection,
  ScheduleSection,
} from './event-sections';
import { DemoAction } from './DemoAction';
import { SectionShell, SiteAction, SiteImageTag } from './parts';
import { SiteContactForm } from './SiteContactForm';

/**
 * The sections a design is made of. Everything from a configuration is drawn as text (React
 * escapes it); no HTML from a design is ever put into the page (architecture 5.4).
 */

type Props<T extends Section['type']> = { section: Extract<Section, { type: T }> };

/** Sections that get a link in the navigation, with the words used for it. */
const navLabels: Partial<Record<Section['type'], string>> = {
  about: 'About',
  skills: 'Skills',
  projects: 'Work',
  experience: 'Experience',
  services: 'Services',
  highlights: 'Why us',
  gallery: 'Work',
  testimonials: 'Reviews',
  schedule: 'Schedule',
  guidelines: 'Guidelines',
  registration: 'Register',
  products: 'Products',
  enquiry: 'Enquire',
  contact: 'Contact',
};

/** Where a template calls a kind of section something else: an event lists events, not services. */
const templateNavLabels: Partial<
  Record<WebsiteConfig['template']['key'], Partial<Record<Section['type'], string>>>
> = {
  event: { services: 'Events' },
};

function HeaderSection({ section, config }: Props<'header'> & { config: WebsiteConfig }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const page = config.pages.find((candidate) => candidate.sections.includes(section));
  const labelOf = (type: Section['type']) =>
    templateNavLabels[config.template.key]?.[type] ?? navLabels[type];
  const links = (page?.sections ?? [])
    .filter((item) => item.enabled && labelOf(item.type))
    .map((item) => ({ href: `#${item.id}`, label: labelOf(item.type) ?? '' }));

  return (
    <header className="ps-header">
      <div className="ps-inner ps-header-row">
        <a className="ps-brand" href="#top">
          {section.content.brandText ?? config.site.name}
        </a>
        <nav aria-label="Site" className="ps-nav">
          <button
            type="button"
            className="ps-menu-button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
          <ul id={menuId} className="ps-nav-links" data-open={open}>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {section.content.action ? (
          <span className="ps-header-action">
            <SiteAction link={section.content.action} variant="primary" />
          </span>
        ) : null}
      </div>
    </header>
  );
}

/** Hero layouts that sit on a full-width band in the design's main colour (Business). */
const bandVariants = new Set(['band', 'banner']);

function HeroSection({ section }: Props<'hero'>) {
  const { content } = section;
  const band = bandVariants.has(section.variant);
  const withPicture = section.variant === 'split' || section.variant === 'band';
  return (
    <section
      className={band ? 'ps-hero-band' : undefined}
      aria-labelledby={`${section.id}-heading`}
    >
      <div className="ps-hero ps-inner" data-variant={section.variant}>
        <div className="ps-hero-text">
          {content.eyebrow ? <p className="ps-eyebrow">{content.eyebrow}</p> : null}
          <h1 id={`${section.id}-heading`}>{content.heading}</h1>
          {content.subheading ? <p className="ps-lead">{content.subheading}</p> : null}
          {content.primaryAction || content.secondaryAction ? (
            <div className="ps-actions">
              {content.primaryAction ? (
                <SiteAction link={content.primaryAction} variant={band ? 'light' : 'primary'} />
              ) : null}
              {content.secondaryAction ? (
                <SiteAction
                  link={content.secondaryAction}
                  variant={band ? 'outline-light' : 'secondary'}
                />
              ) : null}
            </div>
          ) : null}
          {content.stats.length ? (
            <dl className="ps-stats">
              {content.stats.map((stat) => (
                <div key={stat.id}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {content.image && withPicture ? (
          <SiteImageTag image={content.image} className="ps-hero-image" />
        ) : null}
      </div>
    </section>
  );
}

function AboutSection({ section }: Props<'about'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      <div className="ps-about">
        <div className="ps-prose">
          {content.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        {content.facts.length ? (
          <dl className="ps-facts">
            {content.facts.map((fact) => (
              <div key={fact.id} className="ps-fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </SectionShell>
  );
}

function SkillsSection({ section }: Props<'skills'>) {
  const { content } = section;
  const bars = section.variant === 'bars';
  return (
    <SectionShell section={section} heading={content.heading}>
      {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
      <div className="ps-skill-groups">
        {content.groups.map((group) => (
          <div key={group.id} className="ps-skill-group">
            <h3>{group.name}</h3>
            <ul className={bars ? 'ps-bars' : 'ps-chips'}>
              {group.skills.map((skill) =>
                bars && skill.level ? (
                  <li key={skill.id}>
                    <span>{skill.name}</span>
                    <span
                      className="ps-bar"
                      role="img"
                      aria-label={`${String(skill.level)} out of 5`}
                      style={{ '--level': skill.level } as React.CSSProperties}
                    />
                  </li>
                ) : (
                  <li key={skill.id}>{skill.name}</li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function ProjectsSection({ section }: Props<'projects'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
      <ul className="ps-projects">
        {content.items.map((item) => (
          <li key={item.id}>
            <article className="ps-project">
              {item.image ? <SiteImageTag image={item.image} className="ps-project-image" /> : null}
              <div className="ps-project-body">
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                {item.tags.length ? (
                  <ul className="ps-tags" aria-label="Tags">
                    {item.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                ) : null}
                {item.link ? <SiteAction link={item.link} variant="secondary" /> : null}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

function period(item: { start: string; end?: string | undefined }) {
  return item.end ? `${item.start} – ${item.end}` : item.start;
}

function ExperienceSection({ section }: Props<'experience'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      <ol className="ps-timeline">
        {content.items.map((item) => (
          <li key={item.id}>
            <p className="ps-when">{period(item)}</p>
            <h3>{item.role}</h3>
            <p className="ps-where">
              {item.organisation}
              {item.location ? `, ${item.location}` : ''}
            </p>
            {item.summary ? <p>{item.summary}</p> : null}
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

function EducationSection({ section }: Props<'education'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      <ol className="ps-timeline">
        {content.items.map((item) => (
          <li key={item.id}>
            <p className="ps-when">{period(item)}</p>
            <h3>{item.qualification}</h3>
            <p className="ps-where">{item.institution}</p>
            {item.summary ? <p>{item.summary}</p> : null}
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

/** Email, phone and WhatsApp. On a demo they explain instead of contacting anyone. */
function ContactDetails({ contact }: { contact: WebsiteConfig['contact'] }) {
  const { mode } = useSite();
  const details = [
    contact.email && {
      label: contact.email,
      kind: 'Email',
      note: `On the real website, this opens your email app to write to ${contact.email}.`,
    },
    contact.phone && {
      label: contact.phone,
      kind: 'Phone',
      note: `On the real website, this calls ${contact.phone}.`,
    },
    contact.whatsapp && {
      label: 'Chat on WhatsApp',
      kind: 'WhatsApp',
      note: 'On the real website, this opens a WhatsApp chat.',
    },
  ].filter((item): item is { label: string; kind: string; note: string } => Boolean(item));

  return (
    <ul className="ps-contact-details">
      {details.map((detail) => (
        <li key={detail.kind}>
          <span className="ps-detail-kind">{detail.kind}</span>
          {mode === 'demo' ? (
            <DemoAction className="ps-link-button" note={detail.note}>
              {detail.label}
            </DemoAction>
          ) : (
            <span>{detail.label}</span>
          )}
        </li>
      ))}
      {contact.location ? (
        <li>
          <span className="ps-detail-kind">Based in</span>
          <span>{contact.location}</span>
        </li>
      ) : null}
    </ul>
  );
}

function ContactSection({ section, config }: Props<'contact'> & { config: WebsiteConfig }) {
  const { content } = section;
  return (
    <section
      id={section.id}
      className="ps-section ps-inner"
      data-variant={section.variant}
      aria-labelledby={`${section.id}-heading`}
    >
      <div className="ps-contact">
        <div className="ps-contact-text">
          <h2 id={`${section.id}-heading`}>{content.heading}</h2>
          {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
          {content.showDetails ? <ContactDetails contact={config.contact} /> : null}
        </div>
        {content.showForm ? <SiteContactForm /> : null}
      </div>
    </section>
  );
}

const networkNames: Record<WebsiteConfig['social'][number]['network'], string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  instagram: 'Instagram',
  x: 'X',
  facebook: 'Facebook',
  youtube: 'YouTube',
  behance: 'Behance',
  dribbble: 'Dribbble',
};

function FooterSection({ section, config }: Props<'footer'> & { config: WebsiteConfig }) {
  const { mode } = useSite();
  return (
    <footer className="ps-footer">
      <div className="ps-inner ps-footer-row">
        <p>
          © {new Date().getFullYear()} {config.site.name}
          {section.content.text ? ` · ${section.content.text}` : ''}
        </p>
        {section.content.showSocial && config.social.length ? (
          <ul className="ps-social" aria-label="Social profiles">
            {config.social.map((profile) => (
              <li key={profile.network}>
                {mode === 'demo' ? (
                  <DemoAction
                    className="ps-link-button"
                    note={`On the real website, this opens the ${networkNames[profile.network]} profile.`}
                  >
                    {networkNames[profile.network]}
                  </DemoAction>
                ) : (
                  <a href={profile.url} target="_blank" rel="noopener noreferrer">
                    {networkNames[profile.network]}
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </footer>
  );
}

/** Draws one section by its type. */
export function SiteSection({ section, config }: { section: Section; config: WebsiteConfig }) {
  switch (section.type) {
    case 'header':
      return <HeaderSection section={section} config={config} />;
    case 'hero':
      return <HeroSection section={section} />;
    case 'about':
      return <AboutSection section={section} />;
    case 'skills':
      return <SkillsSection section={section} />;
    case 'projects':
      return <ProjectsSection section={section} />;
    case 'experience':
      return <ExperienceSection section={section} />;
    case 'education':
      return <EducationSection section={section} />;
    case 'contact':
      return <ContactSection section={section} config={config} />;
    case 'footer':
      return <FooterSection section={section} config={config} />;
    case 'services':
      return <ServicesSection section={section} />;
    case 'highlights':
      return <HighlightsSection section={section} />;
    case 'gallery':
      return <GallerySection section={section} />;
    case 'testimonials':
      return <TestimonialsSection section={section} />;
    case 'cta':
      return <CtaSection section={section} />;
    case 'facts':
      return <FactsSection section={section} />;
    case 'schedule':
      return <ScheduleSection section={section} />;
    case 'guidelines':
      return <GuidelinesSection section={section} />;
    case 'registration':
      return <RegistrationSection section={section} />;
    case 'products':
      return <ProductsSection section={section} />;
    case 'enquiry':
      return <EnquirySection section={section} />;
  }
}
