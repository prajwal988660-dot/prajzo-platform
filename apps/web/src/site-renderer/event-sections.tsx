import type { FactIcon, Section } from '@prajzo/shared';
import { CalendarDays, Clock, MapPin, Ticket, Trophy, Users, type LucideIcon } from 'lucide-react';
import { SectionShell } from './parts';
import { SiteRegistrationForm } from './SiteRegistrationForm';

/** Sections first used by the College and Event demo (Phase 11); any template may use them. */

type Props<T extends Section['type']> = { section: Extract<Section, { type: T }> };

const factIcons: Record<FactIcon, LucideIcon> = {
  calendar: CalendarDays,
  clock: Clock,
  map: MapPin,
  ticket: Ticket,
  users: Users,
  trophy: Trophy,
};

/** Key facts (date, time, place) in cards. A heading is optional: under a banner, none is needed. */
export function FactsSection({ section }: Props<'facts'>) {
  const { content } = section;
  const list = (
    <dl className="ps-facts-cards">
      {content.items.map((fact) => {
        const Icon = factIcons[fact.icon];
        return (
          <div key={fact.id}>
            <dt>
              <Icon aria-hidden="true" className="ps-fact-icon" />
              {fact.label}
            </dt>
            <dd>{fact.value}</dd>
          </div>
        );
      })}
    </dl>
  );
  if (content.heading) {
    return (
      <SectionShell section={section} heading={content.heading}>
        {list}
      </SectionShell>
    );
  }
  return (
    <section
      id={section.id}
      className="ps-section ps-inner ps-section-facts"
      aria-label="Key facts"
    >
      {list}
    </section>
  );
}

export function ScheduleSection({ section }: Props<'schedule'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
      <div className="ps-days">
        {content.days.map((day) => (
          <section key={day.id} className="ps-day" aria-label={day.name}>
            <h3>{day.name}</h3>
            <ol>
              {day.slots.map((slot) => (
                <li key={slot.id}>
                  <span className="ps-slot-time">{slot.time}</span>
                  <span>
                    {slot.title}
                    {slot.place ? <span className="ps-slot-place">{slot.place}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </SectionShell>
  );
}

export function GuidelinesSection({ section }: Props<'guidelines'>) {
  const { content } = section;
  return (
    <SectionShell section={section} heading={content.heading}>
      <ol className="ps-guidelines">
        {content.items.map((guideline) => (
          <li key={guideline.id}>{guideline.text}</li>
        ))}
      </ol>
    </SectionShell>
  );
}

export function RegistrationSection({ section }: Props<'registration'>) {
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
        </div>
        <SiteRegistrationForm content={content} />
      </div>
    </section>
  );
}
