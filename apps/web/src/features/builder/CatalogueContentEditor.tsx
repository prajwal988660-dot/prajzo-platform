import type { Section } from '@prajzo/shared';
import type { ReactNode } from 'react';
import { CheckboxField } from '../../components/ui/Field';
import { ImageInput, ListEditor, optional, TextInput } from './fields';

type CatalogueSection = Extract<Section, { type: 'products' | 'enquiry' }>;

/** Editors for the sections first used by the Product Catalogue demo (Phase 12). */
export function CatalogueContentEditor({
  section,
  path,
  max,
  onChange,
  issueAt,
  upload,
}: {
  section: CatalogueSection;
  path: string;
  max: number | undefined;
  onChange: (section: Section) => void;
  issueAt: (path: string) => string | undefined;
  upload: (apply: (src: string) => void) => ReactNode;
}) {
  const at = (rest: string) => issueAt(`${path}.content.${rest}`);

  if (section.type === 'enquiry') {
    const { content } = section;
    const set = (next: typeof content) => onChange({ ...section, content: next });
    return (
      <div className="grid gap-4">
        <p className="text-sm text-slate-600">The product list comes from your Products section.</p>
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
        <CheckboxField
          label="Ask for a phone number"
          checked={content.askPhone}
          onChange={(event) => set({ ...content, askPhone: event.target.checked })}
        />
        <CheckboxField
          label="Ask how many"
          checked={content.askQuantity}
          onChange={(event) => set({ ...content, askQuantity: event.target.checked })}
        />
        <TextInput
          label="Note after sending"
          optional
          value={content.closingNote}
          error={at('closingNote')}
          onChange={(closingNote) => set({ ...content, closingNote: optional(closingNote) })}
        />
      </div>
    );
  }

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
      <CheckboxField
        label="Let visitors filter by category"
        checked={content.showFilters}
        onChange={(event) => set({ ...content, showFilters: event.target.checked })}
      />
      <ListEditor<(typeof content.items)[number]>
        label="Products"
        itemLabel="product"
        items={content.items}
        max={max}
        newItem={(id) => ({
          id,
          name: 'New product',
          category: content.items[0]?.category ?? 'Products',
          priceNote: undefined,
          summary: 'What it is, in one or two lines.',
          details: [],
          image: content.items[0]?.image ?? { src: '/demo/catalogue/product-1.webp', alt: '' },
        })}
        onChange={(items) => set({ ...content, items })}
        render={(item, index, change) => {
          const here = (field: string) => at(`items.${String(index)}.${field}`);
          return (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Name"
                  value={item.name}
                  error={here('name')}
                  onChange={(name) => change({ ...item, name })}
                />
                <TextInput
                  label="Category"
                  hint="Products with the same category are filtered together."
                  value={item.category}
                  error={here('category')}
                  onChange={(category) => change({ ...item, category })}
                />
              </div>
              <TextInput
                label="Price"
                optional
                hint="Shown as you write it, for example ₹650 or From ₹1,200."
                value={item.priceNote}
                error={here('priceNote')}
                onChange={(priceNote) => change({ ...item, priceNote: optional(priceNote) })}
              />
              <TextInput
                label="Short description"
                multiline
                value={item.summary}
                error={here('summary')}
                onChange={(summary) => change({ ...item, summary })}
              />
              <TextInput
                label="Details"
                optional
                multiline
                hint="One per line, up to 6: size, material, delivery time…"
                value={item.details.join('\n')}
                error={here('details')}
                onChange={(value) =>
                  change({
                    ...item,
                    details: value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
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
            </div>
          );
        }}
      />
    </div>
  );
}
