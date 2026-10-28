import type { DefinedTemplate, Section } from '@prajzo/shared';
import type { ReactNode } from 'react';
import { CheckboxField } from '../../components/ui/Field';
import { ImageInput, LinkInput, ListEditor, optional, TextInput } from './fields';

type Props = {
  section: Section;
  /** Where this section is in the design, such as pages.0.sections.2. */
  path: string;
  template: DefinedTemplate;
  onChange: (section: Section) => void;
  issueAt: (path: string) => string | undefined;
  /** The upload control for a picture at this place, when uploading is possible. */
  upload?: (onUploaded: (src: string) => void) => ReactNode;
};

/** The editor for one section's content, by its kind. */
export function SectionContentEditor({
  section,
  path,
  template,
  onChange,
  issueAt,
  upload,
}: Props) {
  const at = (rest: string) => issueAt(`${path}.content.${rest}`);
  const max = template.sections[section.type]?.maxItems;
  const uploadFor = (apply: (src: string) => void) => upload?.(apply);

  switch (section.type) {
    case 'header': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Name at the top"
            optional
            hint="Leave empty to use the site name."
            value={content.brandText}
            error={at('brandText')}
            onChange={(value) => set({ ...content, brandText: optional(value) })}
          />
          <LinkInput
            label="Button"
            link={content.action}
            path={`${path}.content.action`}
            errorAt={issueAt}
            onChange={(action) => set({ ...content, action })}
          />
        </div>
      );
    }
    case 'hero': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Small line above the heading"
            optional
            value={content.eyebrow}
            error={at('eyebrow')}
            onChange={(value) => set({ ...content, eyebrow: optional(value) })}
          />
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(value) => set({ ...content, heading: value })}
          />
          <TextInput
            label="Text under the heading"
            optional
            multiline
            value={content.subheading}
            error={at('subheading')}
            onChange={(value) => set({ ...content, subheading: optional(value) })}
          />
          <LinkInput
            label="Main button"
            link={content.primaryAction}
            path={`${path}.content.primaryAction`}
            errorAt={issueAt}
            onChange={(primaryAction) => set({ ...content, primaryAction })}
          />
          <LinkInput
            label="Second button"
            link={content.secondaryAction}
            path={`${path}.content.secondaryAction`}
            errorAt={issueAt}
            onChange={(secondaryAction) => set({ ...content, secondaryAction })}
          />
          <ImageInput
            label="Picture (shown with the split layout)"
            image={content.image}
            path={`${path}.content.image`}
            errorAt={issueAt}
            upload={uploadFor((src) =>
              set({ ...content, image: { src, alt: content.image?.alt ?? '' } }),
            )}
            onChange={(image) => set({ ...content, image })}
          />
        </div>
      );
    }
    case 'about': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(value) => set({ ...content, heading: value })}
          />
          <TextInput
            label="Your story"
            multiline
            hint="Leave an empty line between paragraphs (up to 6)."
            value={content.paragraphs.join('\n\n')}
            error={at('paragraphs') ?? at('paragraphs.0')}
            onChange={(value) =>
              set({
                ...content,
                paragraphs: value
                  .split(/\n\s*\n/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean),
              })
            }
          />
          <ListEditor
            label="Quick facts"
            itemLabel="fact"
            items={content.facts}
            max={max ?? 6}
            min={0}
            newItem={(id) => ({ id, label: 'Label', value: 'Value' })}
            onChange={(facts) => set({ ...content, facts })}
            render={(fact, index, change) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Big text"
                  value={fact.value}
                  error={at(`facts.${String(index)}.value`)}
                  onChange={(value) => change({ ...fact, value })}
                />
                <TextInput
                  label="Small text"
                  value={fact.label}
                  error={at(`facts.${String(index)}.label`)}
                  onChange={(label) => change({ ...fact, label })}
                />
              </div>
            )}
          />
        </div>
      );
    }
    case 'skills': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(value) => set({ ...content, heading: value })}
          />
          {issueAt(`${path}.content`) ? (
            <p className="text-sm font-medium text-red-700">{issueAt(`${path}.content`)}</p>
          ) : null}
          <ListEditor<(typeof content.groups)[number]>
            label="Groups of skills"
            itemLabel="group"
            items={content.groups}
            newItem={(id) => ({
              id,
              name: 'New group',
              skills: [{ id: 'skill-1', name: 'A skill', level: 3 }],
            })}
            onChange={(groups) => set({ ...content, groups })}
            render={(group, groupIndex, changeGroup) => (
              <div className="grid gap-3">
                <TextInput
                  label="Group name"
                  value={group.name}
                  error={at(`groups.${String(groupIndex)}.name`)}
                  onChange={(name) => changeGroup({ ...group, name })}
                />
                <ListEditor<(typeof group.skills)[number]>
                  label="Skills"
                  itemLabel="skill"
                  items={group.skills}
                  newItem={(id) => ({ id, name: 'A skill', level: 3 })}
                  onChange={(skills) => changeGroup({ ...group, skills })}
                  render={(skill, skillIndex, changeSkill) => (
                    <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                      <TextInput
                        label="Skill"
                        value={skill.name}
                        error={at(`groups.${String(groupIndex)}.skills.${String(skillIndex)}.name`)}
                        onChange={(name) => changeSkill({ ...skill, name })}
                      />
                      <label className="grid gap-1.5 text-sm font-medium text-ink">
                        Level (bars layout)
                        <select
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                          value={skill.level ?? 3}
                          onChange={(event) =>
                            changeSkill({ ...skill, level: Number(event.target.value) })
                          }
                        >
                          {[1, 2, 3, 4, 5].map((level) => (
                            <option key={level} value={level}>
                              {level} of 5
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                />
              </div>
            )}
          />
        </div>
      );
    }
    case 'projects': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(value) => set({ ...content, heading: value })}
          />
          <TextInput
            label="Introduction"
            optional
            multiline
            value={content.intro}
            error={at('intro')}
            onChange={(value) => set({ ...content, intro: optional(value) })}
          />
          <ListEditor
            label="Projects"
            itemLabel="project"
            items={content.items}
            max={max}
            newItem={(id) => ({
              id,
              title: 'New project',
              summary: 'What it is and what you did.',
              tags: [],
            })}
            onChange={(items) => set({ ...content, items })}
            render={(item, index, change) => (
              <div className="grid gap-3">
                <TextInput
                  label="Title"
                  value={item.title}
                  error={at(`items.${String(index)}.title`)}
                  onChange={(title) => change({ ...item, title })}
                />
                <TextInput
                  label="Summary"
                  multiline
                  value={item.summary}
                  error={at(`items.${String(index)}.summary`)}
                  onChange={(summary) => change({ ...item, summary })}
                />
                <TextInput
                  label="Tags"
                  optional
                  hint="Separated by commas, up to 6."
                  value={item.tags.join(', ')}
                  error={at(`items.${String(index)}.tags`)}
                  onChange={(value) =>
                    change({
                      ...item,
                      tags: value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <ImageInput
                  label="Picture"
                  image={item.image}
                  path={`${path}.content.items.${String(index)}.image`}
                  errorAt={issueAt}
                  upload={uploadFor((src) =>
                    change({ ...item, image: { src, alt: item.image?.alt ?? '' } }),
                  )}
                  onChange={(image) => change({ ...item, image })}
                />
                <LinkInput
                  label="Link"
                  link={item.link}
                  path={`${path}.content.items.${String(index)}.link`}
                  errorAt={issueAt}
                  onChange={(link) => change({ ...item, link })}
                />
              </div>
            )}
          />
        </div>
      );
    }
    case 'experience': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(value) => set({ ...content, heading: value })}
          />
          <ListEditor<(typeof content.items)[number]>
            label="Jobs"
            itemLabel="job"
            items={content.items}
            max={max}
            newItem={(id) => ({
              id,
              role: 'Role',
              organisation: 'Company',
              location: undefined,
              start: '2024',
              end: 'Present',
              summary: undefined,
            })}
            onChange={(items) => set({ ...content, items })}
            render={(item, index, change) => {
              const here = (field: string) => at(`items.${String(index)}.${field}`);
              return (
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput
                    label="Role"
                    value={item.role}
                    error={here('role')}
                    onChange={(role) => change({ ...item, role })}
                  />
                  <TextInput
                    label="Organisation"
                    value={item.organisation}
                    error={here('organisation')}
                    onChange={(organisation) => change({ ...item, organisation })}
                  />
                  <TextInput
                    label="From"
                    value={item.start}
                    error={here('start')}
                    onChange={(start) => change({ ...item, start })}
                  />
                  <TextInput
                    label="To"
                    optional
                    hint="For example 2023, or Present."
                    value={item.end}
                    error={here('end')}
                    onChange={(end) => change({ ...item, end: optional(end) })}
                  />
                  <TextInput
                    label="Place"
                    optional
                    value={item.location}
                    error={here('location')}
                    onChange={(location) => change({ ...item, location: optional(location) })}
                  />
                  <TextInput
                    label="What you did"
                    optional
                    multiline
                    value={item.summary}
                    error={here('summary')}
                    onChange={(summary) => change({ ...item, summary: optional(summary) })}
                  />
                </div>
              );
            }}
          />
        </div>
      );
    }
    case 'education': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(value) => set({ ...content, heading: value })}
          />
          <ListEditor<(typeof content.items)[number]>
            label="Qualifications"
            itemLabel="qualification"
            items={content.items}
            max={max}
            newItem={(id) => ({
              id,
              qualification: 'Qualification',
              institution: 'Institution',
              start: '2020',
              end: '2024',
              summary: undefined,
            })}
            onChange={(items) => set({ ...content, items })}
            render={(item, index, change) => {
              const here = (field: string) => at(`items.${String(index)}.${field}`);
              return (
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput
                    label="Qualification"
                    value={item.qualification}
                    error={here('qualification')}
                    onChange={(qualification) => change({ ...item, qualification })}
                  />
                  <TextInput
                    label="Institution"
                    value={item.institution}
                    error={here('institution')}
                    onChange={(institution) => change({ ...item, institution })}
                  />
                  <TextInput
                    label="From"
                    value={item.start}
                    error={here('start')}
                    onChange={(start) => change({ ...item, start })}
                  />
                  <TextInput
                    label="To"
                    optional
                    value={item.end}
                    error={here('end')}
                    onChange={(end) => change({ ...item, end: optional(end) })}
                  />
                </div>
              );
            }}
          />
        </div>
      );
    }
    case 'contact': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(value) => set({ ...content, heading: value })}
          />
          <TextInput
            label="Introduction"
            optional
            multiline
            value={content.intro}
            error={at('intro')}
            onChange={(value) => set({ ...content, intro: optional(value) })}
          />
          <CheckboxField
            label="Show the contact form"
            checked={content.showForm}
            onChange={(event) => set({ ...content, showForm: event.target.checked })}
          />
          <CheckboxField
            label="Show your email, phone and WhatsApp"
            hint="They are set in the Site step."
            checked={content.showDetails}
            onChange={(event) => set({ ...content, showDetails: event.target.checked })}
          />
        </div>
      );
    }
    case 'footer': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <TextInput
            label="Line at the bottom"
            optional
            value={content.text}
            error={at('text')}
            onChange={(value) => set({ ...content, text: optional(value) })}
          />
          <CheckboxField
            label="Show social profile links"
            checked={content.showSocial}
            onChange={(event) => set({ ...content, showSocial: event.target.checked })}
          />
        </div>
      );
    }
  }
}
