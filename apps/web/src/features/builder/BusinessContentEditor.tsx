import { serviceIcons, type Section, type ServiceIcon } from '@prajzo/shared';
import type { ReactNode } from 'react';
import { ImageInput, LinkInput, ListEditor, optional, TextInput } from './fields';

type BusinessSection = Extract<
  Section,
  { type: 'services' | 'highlights' | 'gallery' | 'testimonials' | 'cta' }
>;

const iconNames: Record<ServiceIcon, string> = {
  sparkles: 'Sparkles',
  sign: 'Sign',
  card: 'Card',
  banner: 'Banner',
  printer: 'Printer',
  brush: 'Brush',
  truck: 'Delivery',
  clock: 'Clock',
  shield: 'Shield',
  star: 'Star',
  phone: 'Phone',
  leaf: 'Leaf',
};

/** Editors for the sections first used by the Business demo (Phase 10). */
export function BusinessContentEditor({
  section,
  path,
  max,
  onChange,
  issueAt,
  upload,
}: {
  section: BusinessSection;
  path: string;
  max: number | undefined;
  onChange: (section: Section) => void;
  issueAt: (path: string) => string | undefined;
  upload: (apply: (src: string) => void) => ReactNode;
}) {
  const at = (rest: string) => issueAt(`${path}.content.${rest}`);
  const intro = (value: string | undefined, set: (value: string | undefined) => void) => (
    <TextInput
      label="Introduction"
      optional
      multiline
      value={value}
      error={at('intro')}
      onChange={(next) => set(optional(next))}
    />
  );

  switch (section.type) {
    case 'services': {
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
          {intro(content.intro, (value) => set({ ...content, intro: value }))}
          <ListEditor<(typeof content.items)[number]>
            label="Services"
            itemLabel="service"
            items={content.items}
            max={max}
            newItem={(id) => ({
              id,
              title: 'New service',
              description: 'What it is and who it is for.',
              priceNote: undefined,
              icon: 'sparkles',
            })}
            onChange={(items) => set({ ...content, items })}
            render={(item, index, change) => (
              <div className="grid gap-3">
                <TextInput
                  label="Name"
                  value={item.title}
                  error={at(`items.${String(index)}.title`)}
                  onChange={(title) => change({ ...item, title })}
                />
                <TextInput
                  label="Description"
                  multiline
                  value={item.description}
                  error={at(`items.${String(index)}.description`)}
                  onChange={(description) => change({ ...item, description })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput
                    label="Price note"
                    optional
                    hint="Shown as you write it, for example: From ₹2,500."
                    value={item.priceNote}
                    error={at(`items.${String(index)}.priceNote`)}
                    onChange={(priceNote) => change({ ...item, priceNote: optional(priceNote) })}
                  />
                  <label className="grid gap-1.5 text-sm font-medium text-ink">
                    Picture
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                      value={item.icon}
                      onChange={(event) =>
                        change({ ...item, icon: event.target.value as ServiceIcon })
                      }
                    >
                      {serviceIcons.map((icon) => (
                        <option key={icon} value={icon}>
                          {iconNames[icon]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
          />
        </div>
      );
    }
    case 'highlights': {
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
          {intro(content.intro, (value) => set({ ...content, intro: value }))}
          <ListEditor<(typeof content.items)[number]>
            label="Highlights"
            itemLabel="highlight"
            items={content.items}
            max={max}
            newItem={(id) => ({
              id,
              title: 'A good reason',
              text: 'Why it matters to your customers.',
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
                  label="One line"
                  value={item.text}
                  error={at(`items.${String(index)}.text`)}
                  onChange={(text) => change({ ...item, text })}
                />
              </div>
            )}
          />
        </div>
      );
    }
    case 'gallery': {
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
          {intro(content.intro, (value) => set({ ...content, intro: value }))}
          <ListEditor<(typeof content.items)[number]>
            label="Pictures"
            itemLabel="picture"
            items={content.items}
            max={max}
            newItem={(id) => ({
              id,
              image: content.items[0]?.image ?? { src: '/demo/business/gallery-1.webp', alt: '' },
              caption: undefined,
            })}
            onChange={(items) => set({ ...content, items })}
            render={(item, index, change) => (
              <div className="grid gap-3">
                <ImageInput
                  label="Picture"
                  image={item.image}
                  path={`${path}.content.items.${String(index)}.image`}
                  errorAt={issueAt}
                  upload={upload((src) => change({ ...item, image: { src, alt: '' } }))}
                  onChange={(image) => {
                    if (image) change({ ...item, image });
                  }}
                />
                <TextInput
                  label="Caption"
                  optional
                  value={item.caption}
                  error={at(`items.${String(index)}.caption`)}
                  onChange={(caption) => change({ ...item, caption: optional(caption) })}
                />
              </div>
            )}
          />
        </div>
      );
    }
    case 'testimonials': {
      const { content } = section;
      const set = (next: typeof content) => onChange({ ...section, content: next });
      return (
        <div className="grid gap-4">
          <p className="text-sm text-slate-600">
            Use real words from real customers, with their permission.
          </p>
          <TextInput
            label="Heading"
            value={content.heading}
            error={at('heading')}
            onChange={(heading) => set({ ...content, heading })}
          />
          <ListEditor<(typeof content.items)[number]>
            label="Reviews"
            itemLabel="review"
            items={content.items}
            max={max}
            newItem={(id) => ({
              id,
              quote: 'What the customer said.',
              name: 'Customer name',
              role: undefined,
            })}
            onChange={(items) => set({ ...content, items })}
            render={(item, index, change) => (
              <div className="grid gap-3">
                <TextInput
                  label="What they said"
                  multiline
                  value={item.quote}
                  error={at(`items.${String(index)}.quote`)}
                  onChange={(quote) => change({ ...item, quote })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput
                    label="Name"
                    value={item.name}
                    error={at(`items.${String(index)}.name`)}
                    onChange={(name) => change({ ...item, name })}
                  />
                  <TextInput
                    label="Who they are"
                    optional
                    value={item.role}
                    error={at(`items.${String(index)}.role`)}
                    onChange={(role) => change({ ...item, role: optional(role) })}
                  />
                </div>
              </div>
            )}
          />
        </div>
      );
    }
    case 'cta': {
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
            label="Text"
            optional
            multiline
            value={content.text}
            error={at('text')}
            onChange={(text) => set({ ...content, text: optional(text) })}
          />
          <LinkInput
            label="Button"
            link={content.action}
            path={`${path}.content.action`}
            errorAt={issueAt}
            removable={false}
            onChange={(action) => {
              if (action) set({ ...content, action });
            }}
          />
        </div>
      );
    }
  }
}
