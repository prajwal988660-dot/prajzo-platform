import type { SiteImage, SiteLink } from '@prajzo/shared';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { CheckboxField, TextAreaField, TextField } from '../../components/ui/Field';

/**
 * The small editors the builder is made of. Each shows the problem at its own place in the design
 * (`error`), checked with the same rules the server uses.
 */

export function TextInput({
  label,
  value,
  onChange,
  error,
  hint,
  multiline = false,
  optional = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string;
  multiline?: boolean;
  optional?: boolean;
}) {
  const shown = optional ? `${label} (optional)` : label;
  return multiline ? (
    <TextAreaField
      label={shown}
      rows={3}
      value={value ?? ''}
      error={error}
      hint={hint}
      onChange={(event) => onChange(event.target.value)}
    />
  ) : (
    <TextField
      label={shown}
      value={value ?? ''}
      error={error}
      hint={hint}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** Text that is optional in the design: an empty box means "not shown". */
export const optional = (value: string): string | undefined => (value === '' ? undefined : value);

export function LinkInput({
  label,
  link,
  onChange,
  errorAt,
  path,
  removable = true,
}: {
  label: string;
  link: SiteLink | undefined;
  onChange: (link: SiteLink | undefined) => void;
  errorAt: (path: string) => string | undefined;
  path: string;
  removable?: boolean;
}) {
  if (!link) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="justify-self-start"
        onClick={() => onChange({ label: 'Learn more', href: '#contact' })}
      >
        <Plus aria-hidden="true" className="size-4" />
        Add {label.toLowerCase()}
      </Button>
    );
  }
  return (
    <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{label}</legend>
      <TextInput
        label="Words on the button"
        value={link.label}
        error={errorAt(`${path}.label`)}
        onChange={(value) => onChange({ ...link, label: value })}
      />
      <TextInput
        label="Where it goes"
        value={link.href}
        error={errorAt(`${path}.href`)}
        hint="A part of this page (#contact, #work), a web address (https://…), an email (mailto:…) or a phone (tel:…)."
        onChange={(value) => onChange({ ...link, href: value.trim() })}
      />
      {removable ? (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => onChange(undefined)}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Remove {label.toLowerCase()}
        </Button>
      ) : null}
    </fieldset>
  );
}

export function ImageInput({
  label,
  image,
  onChange,
  errorAt,
  path,
  upload,
}: {
  label: string;
  image: SiteImage | undefined;
  onChange: (image: SiteImage | undefined) => void;
  errorAt: (path: string) => string | undefined;
  path: string;
  /** The upload control, when uploading is possible (signed-in customers). */
  upload?: ReactNode;
}) {
  return (
    <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{label}</legend>
      {image ? (
        <>
          <img
            src={image.src}
            alt=""
            className="max-h-40 w-auto max-w-full justify-self-start rounded-lg border border-slate-200 object-contain"
          />
          <TextInput
            label="Describe the picture"
            value={image.alt}
            error={errorAt(`${path}.alt`)}
            hint="For people who can't see it, and for search engines."
            onChange={(value) => onChange({ ...image, alt: value })}
          />
          <CheckboxField
            label="Only decoration (nothing to describe)"
            checked={image.decorative === true}
            onChange={(event) =>
              onChange({ ...image, decorative: event.target.checked ? true : undefined })
            }
          />
        </>
      ) : (
        <p className="text-sm text-slate-600">No picture.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {upload}
        {image ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            <Trash2 aria-hidden="true" className="size-4" />
            Remove picture
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}

/**
 * A list the visitor can add to, reorder and shorten (skills, projects, jobs…), within the
 * template's limit.
 */
export function ListEditor<Item extends { id: string }>({
  label,
  itemLabel,
  items,
  onChange,
  newItem,
  max,
  min = 1,
  render,
}: {
  label: string;
  /** What one item is called: "project", "job". */
  itemLabel: string;
  items: Item[];
  onChange: (items: Item[]) => void;
  newItem: (id: string) => Item;
  max?: number | undefined;
  min?: number;
  render: (item: Item, index: number, change: (item: Item) => void) => ReactNode;
}) {
  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(index + by, 0, moved);
    onChange(next);
  };
  const full = max !== undefined && items.length >= max;
  const freshId = () => {
    let n = items.length + 1;
    while (items.some((item) => item.id === `${itemLabel.replaceAll(' ', '-')}-${String(n)}`))
      n += 1;
    return `${itemLabel.replaceAll(' ', '-')}-${String(n)}`;
  };

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-semibold text-ink">
        {label}{' '}
        <span className="font-normal text-slate-600">
          ({items.length}
          {max !== undefined ? ` of ${String(max)}` : ''})
        </span>
      </legend>
      <ol className="grid gap-3">
        {items.map((item, index) => (
          <li key={item.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">
                {itemLabel[0]?.toUpperCase()}
                {itemLabel.slice(1)} {index + 1}
              </p>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  aria-label={`Move ${itemLabel} ${String(index + 1)} up`}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === items.length - 1}
                  aria-label={`Move ${itemLabel} ${String(index + 1)} down`}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={items.length <= min}
                  aria-label={`Remove ${itemLabel} ${String(index + 1)}`}
                  onClick={() => onChange(items.filter((_, other) => other !== index))}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>
            {render(item, index, (changed) =>
              onChange(items.map((other, at) => (at === index ? changed : other))),
            )}
          </li>
        ))}
      </ol>
      <Button
        variant="secondary"
        size="sm"
        className="justify-self-start"
        disabled={full}
        onClick={() => onChange([...items, newItem(freshId())])}
      >
        <Plus aria-hidden="true" className="size-4" />
        {full ? `The most is ${String(max)}` : `Add a ${itemLabel}`}
      </Button>
    </fieldset>
  );
}
