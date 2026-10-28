import { factIcons, type FactIcon, type Section } from '@prajzo/shared';
import { CheckboxField } from '../../components/ui/Field';
import { ListEditor, optional, TextInput } from './fields';

type EventSection = Extract<
  Section,
  { type: 'facts' | 'schedule' | 'guidelines' | 'registration' }
>;

const iconNames: Record<FactIcon, string> = {
  calendar: 'Calendar',
  clock: 'Clock',
  map: 'Map pin',
  ticket: 'Ticket',
  users: 'People',
  trophy: 'Trophy',
};

/** Editors for the sections first used by the College and Event demo (Phase 11). */
export function EventContentEditor({
  section,
  path,
  max,
  onChange,
  issueAt,
}: {
  section: EventSection;
  path: string;
  max: number | undefined;
  onChange: (section: Section) => void;
  issueAt: (path: string) => string | undefined;
}) {
  const at = (rest: string) => issueAt(`${path}.content.${rest}`);

  switch (section.type) {
    case 'facts': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            optional
            hint="Leave empty when the cards sit right under the banner."
            value={content.heading}
            error={at('heading')}
            onChange={(heading) => set({ ...content, heading: optional(heading) })}
          />
          <ListEditor<(typeof content.items)[number]>
            label="Facts"
            itemLabel="fact"
            items={content.items}
            max={max}
            newItem={(id) => ({ id, label: 'When', value: 'A date', icon: 'calendar' })}
            onChange={(items) => set({ ...content, items })}
            render={(item, index, change) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput
                  label="Label"
                  value={item.label}
                  error={at(`items.${String(index)}.label`)}
                  onChange={(label) => change({ ...item, label })}
                />
                <TextInput
                  label="Value"
                  value={item.value}
                  error={at(`items.${String(index)}.value`)}
                  onChange={(value) => change({ ...item, value })}
                />
                <label className="grid gap-1.5 text-sm font-medium text-ink">
                  Picture
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                    value={item.icon}
                    onChange={(event) => change({ ...item, icon: event.target.value as FactIcon })}
                  >
                    {factIcons.map((icon) => (
                      <option key={icon} value={icon}>
                        {iconNames[icon]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          />
        </div>
      );
    }
    case 'schedule': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(heading) => set({ ...content, heading })}
          />
          <TextInput
            label="Introduction"
            optional
            multiline
            value={content.intro}
            error={at('intro')}
            onChange={(intro) => set({ ...content, intro: optional(intro) })}
          />
          {issueAt(`${path}.content`) ? (
            <p className="text-sm font-medium text-red-700">{issueAt(`${path}.content`)}</p>
          ) : null}
          <ListEditor<(typeof content.days)[number]>
            label="Days"
            itemLabel="day"
            items={content.days}
            newItem={(id) => ({
              id,
              name: 'New day',
              slots: [{ id: 'slot-1', time: '10:00', title: 'What happens', place: undefined }],
            })}
            onChange={(days) => set({ ...content, days })}
            render={(day, dayIndex, changeDay) => (
              <div className="grid gap-3">
                <TextInput
                  label="Day"
                  value={day.name}
                  error={at(`days.${String(dayIndex)}.name`)}
                  onChange={(name) => changeDay({ ...day, name })}
                />
                <ListEditor<(typeof day.slots)[number]>
                  label="Sessions"
                  itemLabel="session"
                  items={day.slots}
                  newItem={(id) => ({ id, time: '12:00', title: 'What happens', place: undefined })}
                  onChange={(slots) => changeDay({ ...day, slots })}
                  render={(slot, slotIndex, changeSlot) => {
                    const here = (field: string) =>
                      at(`days.${String(dayIndex)}.slots.${String(slotIndex)}.${field}`);
                    return (
                      <div className="grid gap-3 sm:grid-cols-[6rem_1fr_1fr]">
                        <TextInput
                          label="Time"
                          value={slot.time}
                          error={here('time')}
                          onChange={(time) => changeSlot({ ...slot, time })}
                        />
                        <TextInput
                          label="What happens"
                          value={slot.title}
                          error={here('title')}
                          onChange={(title) => changeSlot({ ...slot, title })}
                        />
                        <TextInput
                          label="Where"
                          optional
                          value={slot.place}
                          error={here('place')}
                          onChange={(place) => changeSlot({ ...slot, place: optional(place) })}
                        />
                      </div>
                    );
                  }}
                />
              </div>
            )}
          />
        </div>
      );
    }
    case 'guidelines': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(heading) => set({ ...content, heading })}
          />
          <ListEditor<(typeof content.items)[number]>
            label="Guidelines"
            itemLabel="guideline"
            items={content.items}
            max={max}
            newItem={(id) => ({ id, text: 'A rule or a tip for people coming.' })}
            onChange={(items) => set({ ...content, items })}
            render={(item, index, change) => (
              <TextInput
                label="Guideline"
                multiline
                value={item.text}
                error={at(`items.${String(index)}.text`)}
                onChange={(text) => change({ ...item, text })}
              />
            )}
          />
        </div>
      );
    }
    case 'registration': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(heading) => set({ ...content, heading })}
          />
          <TextInput
            label="Introduction"
            optional
            multiline
            value={content.intro}
            error={at('intro')}
            onChange={(intro) => set({ ...content, intro: optional(intro) })}
          />
          <TextInput
            label="What people choose"
            hint="The label of the list, such as Event, Workshop or Ticket."
            value={content.eventLabel}
            error={at('eventLabel')}
            onChange={(eventLabel) => set({ ...content, eventLabel })}
          />
          <TextInput
            label="The choices"
            multiline
            hint="One per line, up to 20."
            value={content.events.join('\n')}
            error={at('events') ?? at('events.0')}
            onChange={(value) =>
              set({
                ...content,
                events: value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
          />
          <CheckboxField
            label="Ask for a phone number"
            checked={content.askPhone}
            onChange={(event) => set({ ...content, askPhone: event.target.checked })}
          />
          <CheckboxField
            label="Ask which organisation they are from"
            checked={content.askOrganisation}
            onChange={(event) => set({ ...content, askOrganisation: event.target.checked })}
          />
          {content.askOrganisation ? (
            <TextInput
              label="Organisation label"
              hint="Such as College, Company or School."
              value={content.organisationLabel}
              error={at('organisationLabel')}
              onChange={(organisationLabel) => set({ ...content, organisationLabel })}
            />
          ) : null}
          <TextInput
            label="Note after registering"
            optional
            value={content.closingNote}
            error={at('closingNote')}
            onChange={(closingNote) => set({ ...content, closingNote: optional(closingNote) })}
          />
        </div>
      );
    }
  }
}
