import {
  colorRoles,
  contrastRatio,
  fontCatalogue,
  readableTextOn,
  socialNetworks,
  type ColorRole,
  type DefinedTemplate,
  type Section,
  type WebsiteConfig,
} from '@prajzo/shared';
import { AlertTriangle, ArrowDown, ArrowUp, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CheckboxField } from '../../components/ui/Field';
import { cx } from '../../lib/cx';
import { ListEditor, optional, TextInput } from './fields';
import { SectionContentEditor } from './SectionContentEditor';
import type { Builder } from './use-builder';

type StepProps = { builder: Builder; template: DefinedTemplate };

/** What each kind of section is called in the builder. */
export const sectionNames: Record<Section['type'], string> = {
  header: 'Navigation',
  hero: 'Hero (top of the page)',
  about: 'About',
  skills: 'Skills',
  projects: 'Projects',
  experience: 'Experience',
  education: 'Education',
  contact: 'Contact',
  footer: 'Footer',
  services: 'Services',
  highlights: 'Why choose us',
  gallery: 'Gallery',
  testimonials: 'Reviews',
  cta: 'Call to action',
};

const variantNames: Record<string, string> = {
  minimal: 'Simple',
  split: 'Text and picture side by side',
  centered: 'Centred, no picture',
  story: 'Story with quick facts',
  chips: 'Chips',
  bars: 'Bars with levels',
  grid: 'Grid of cards',
  list: 'List',
  timeline: 'Timeline',
  simple: 'Simple',
  band: 'Coloured band with a picture',
  banner: 'Coloured band, centred',
  cards: 'Cards',
};

function StepHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid gap-1">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children ? <p className="text-sm text-slate-600">{children}</p> : null}
    </div>
  );
}

// ---------- Site: name, description, contact details, social links

export function SiteStep({ builder }: StepProps) {
  const { config, update, issueAt } = builder;
  return (
    <div className="grid gap-5">
      <StepHeading title="Your site">
        The name, a short description, and how people reach you.
      </StepHeading>
      <TextInput
        label="Site name"
        value={config.site.name}
        error={issueAt('site.name')}
        hint="Usually your name or your business's name."
        onChange={(value) => update((draft) => void (draft.site.name = value))}
      />
      <TextInput
        label="Tagline"
        optional
        value={config.site.tagline}
        error={issueAt('site.tagline')}
        onChange={(value) => update((draft) => void (draft.site.tagline = optional(value)))}
      />
      <TextInput
        label="Description for search results"
        optional
        multiline
        value={config.site.description}
        error={issueAt('site.description')}
        onChange={(value) => update((draft) => void (draft.site.description = optional(value)))}
      />
      <fieldset className="grid gap-4 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Contact details</legend>
        {(
          [
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['whatsapp', 'WhatsApp number'],
            ['location', 'Where you are based'],
          ] as const
        ).map(([key, label]) => (
          <TextInput
            key={key}
            label={label}
            optional
            value={config.contact[key]}
            error={issueAt(`contact.${key}`)}
            onChange={(value) =>
              update((draft) => {
                const trimmed = optional(value.trim() === '' ? '' : value);
                if (trimmed === undefined) delete draft.contact[key];
                else draft.contact[key] = trimmed;
              })
            }
          />
        ))}
      </fieldset>
      <ListEditor
        label="Social profiles"
        itemLabel="profile"
        min={0}
        max={8}
        items={config.social.map((profile, index) => ({
          ...profile,
          id: `profile-${String(index)}`,
        }))}
        newItem={(id) => ({
          id,
          network: 'linkedin' as const,
          url: 'https://www.linkedin.com/in/',
        })}
        onChange={(items) =>
          update(
            (draft) => void (draft.social = items.map(({ network, url }) => ({ network, url }))),
          )
        }
        render={(profile, index, change) => (
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Network
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={profile.network}
                onChange={(event) =>
                  change({
                    ...profile,
                    network: event.target.value as (typeof socialNetworks)[number],
                  })
                }
              >
                {socialNetworks.map((network) => (
                  <option key={network} value={network}>
                    {network === 'x' ? 'X' : network[0]!.toUpperCase() + network.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <TextInput
              label="Profile address"
              value={profile.url}
              error={issueAt(`social.${String(index)}.url`)}
              onChange={(url) => change({ ...profile, url: url.trim() })}
            />
          </div>
        )}
      />
    </div>
  );
}

// ---------- Sections: which are shown, their order and layouts

export function SectionsStep({ builder, template }: StepProps) {
  const { config, update } = builder;
  const page = config.pages[0];
  if (!page) return null;
  const sections = page.sections;
  const fixed = (section: Section) => section.type === 'header' || section.type === 'footer';

  const move = (index: number, by: -1 | 1) =>
    update((draft) => {
      const list = draft.pages[0]!.sections;
      const [moved] = list.splice(index, 1);
      if (moved) list.splice(index + by, 0, moved);
    });

  return (
    <div className="grid gap-5">
      <StepHeading title="Sections">
        Choose which sections your page has, their order and their layout. Navigation, hero and
        footer are always there.
      </StepHeading>
      <ol className="grid gap-3">
        {sections.map((section, index) => {
          const rule = template.sections[section.type];
          const required = rule?.required ?? false;
          const canMoveUp = !fixed(section) && index > 1;
          const canMoveDown = !fixed(section) && index < sections.length - 2;
          return (
            <li
              key={section.id}
              className={cx(
                'grid gap-3 rounded-xl border bg-white p-4',
                section.enabled ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  {sectionNames[section.type]}
                  {required ? (
                    <Badge>
                      <Lock aria-hidden="true" className="size-3" /> Always shown
                    </Badge>
                  ) : null}
                </p>
                {!fixed(section) ? (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canMoveUp}
                      aria-label={`Move ${sectionNames[section.type]} up`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canMoveDown}
                      aria-label={`Move ${sectionNames[section.type]} down`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
              {!required ? (
                <CheckboxField
                  label={`Show the ${sectionNames[section.type].toLowerCase()} section`}
                  checked={section.enabled}
                  onChange={(event) =>
                    update(
                      (draft) =>
                        void (draft.pages[0]!.sections[index]!.enabled = event.target.checked),
                    )
                  }
                />
              ) : null}
              {rule && rule.variants.length > 1 ? (
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium text-ink">Layout</legend>
                  <div className="flex flex-wrap gap-2">
                    {rule.variants.map((variant) => (
                      <label
                        key={variant}
                        className={cx(
                          'cursor-pointer rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-blue',
                          section.variant === variant
                            ? 'border-brand-indigo bg-indigo-50 font-semibold text-brand-indigo'
                            : 'border-slate-300',
                        )}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={`variant-${section.id}`}
                          value={variant}
                          checked={section.variant === variant}
                          onChange={() =>
                            update(
                              (draft) => void (draft.pages[0]!.sections[index]!.variant = variant),
                            )
                          }
                        />
                        {variantNames[variant] ?? variant}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------- Content: every section's words, buttons, pictures and lists

export function ContentStep({
  builder,
  template,
  upload,
}: StepProps & { upload?: (onUploaded: (src: string) => void) => ReactNode }) {
  const { config, update, issueAt, issues } = builder;
  const page = config.pages[0];
  if (!page) return null;
  return (
    <div className="grid gap-5">
      <StepHeading title="Content">
        Your words, buttons, pictures and lists, section by section.
      </StepHeading>
      {page.sections.map((section, index) => {
        if (!section.enabled) return null;
        const path = `pages.0.sections.${String(index)}`;
        const problems = issues.filter((issue) => issue.path.startsWith(`${path}.`)).length;
        return (
          <details
            key={section.id}
            className="group rounded-xl border border-slate-200 bg-white"
            open={index === 1}
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold">
              {sectionNames[section.type]}
              {problems ? <Badge tone="danger">{problems} to fix</Badge> : null}
            </summary>
            <div className="border-t border-slate-200 p-4">
              <SectionContentEditor
                section={section}
                path={path}
                template={template}
                issueAt={issueAt}
                upload={upload}
                onChange={(changed) =>
                  update((draft) => void (draft.pages[0]!.sections[index] = changed))
                }
              />
            </div>
          </details>
        );
      })}
    </div>
  );
}

// ---------- Design: looks, colours, fonts, buttons, spacing

const colorNames: Record<ColorRole, string> = {
  primary: 'Main colour (buttons)',
  accent: 'Accent (small highlights)',
  background: 'Page background',
  surface: 'Cards and boxes',
  text: 'Text',
};

/** Pairs of colours that must stay readable, with what each pair is (WCAG AA: 4.5 to 1). */
function contrastWarnings(colors: WebsiteConfig['design']['colors']): string[] {
  const pairs: [string, string, string][] = [
    ['Text on the page background', colors.text, colors.background],
    ['Text on cards and boxes', colors.text, colors.surface],
    ['Accent text on the page background', colors.accent, colors.background],
    ['Button words on the main colour', readableTextOn(colors.primary), colors.primary],
  ];
  return pairs
    .filter(([, a, b]) => contrastRatio(a, b) < 4.5)
    .map(
      ([what, a, b]) =>
        `${what} is hard to read (${contrastRatio(a, b).toFixed(1)} to 1; aim for 4.5 or more).`,
    );
}

export function DesignStep({ builder, template }: StepProps) {
  const { config, update } = builder;
  const { design } = config;
  const warnings = contrastWarnings(design.colors);
  const fontOptions = (ids: string[]) =>
    ids.map((id) => (
      <option key={id} value={id}>
        {fontCatalogue[id as keyof typeof fontCatalogue].name}
      </option>
    ));

  return (
    <div className="grid gap-6">
      <StepHeading title="Design">
        Start from a look, then change any colour, typeface or shape.
      </StepHeading>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Look</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {template.design.themes.map((theme) => (
            <label
              key={theme.key}
              className={cx(
                'grid cursor-pointer gap-2 rounded-xl border p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-blue',
                design.theme === theme.key
                  ? 'border-brand-indigo ring-1 ring-brand-indigo'
                  : 'border-slate-300',
              )}
            >
              <input
                type="radio"
                name="theme"
                className="sr-only"
                value={theme.key}
                checked={design.theme === theme.key}
                onChange={() =>
                  update((draft) => {
                    draft.design.theme = theme.key;
                    draft.design.colors = { ...theme.colors };
                  })
                }
              />
              <span className="flex gap-1" aria-hidden="true">
                {colorRoles.map((role) => (
                  <span
                    key={role}
                    className="size-5 rounded border border-black/10"
                    style={{ backgroundColor: theme.colors[role] }}
                  />
                ))}
              </span>
              <span className="font-semibold">{theme.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-semibold text-ink">Colours</legend>
        {colorRoles.map((role) => (
          <label key={role} className="flex items-center justify-between gap-3 text-sm">
            <span>{colorNames[role]}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-600">{design.colors[role]}</span>
              <input
                type="color"
                aria-label={colorNames[role]}
                className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                value={design.colors[role]}
                onChange={(event) =>
                  update(
                    (draft) => void (draft.design.colors[role] = event.target.value.toLowerCase()),
                  )
                }
              />
            </span>
          </label>
        ))}
        {warnings.length ? (
          <div
            role="status"
            className="grid gap-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle aria-hidden="true" className="size-4" />
              Some text may be hard to read
            </p>
            <ul className="list-disc pl-5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <p>You can still save; this is advice, not a rule.</p>
          </div>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Headings typeface
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={design.fonts.heading}
            onChange={(event) =>
              update(
                (draft) =>
                  void (draft.design.fonts.heading = event.target
                    .value as typeof draft.design.fonts.heading),
              )
            }
          >
            {fontOptions(template.design.fonts.heading)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Text typeface
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={design.fonts.body}
            onChange={(event) =>
              update(
                (draft) =>
                  void (draft.design.fonts.body = event.target
                    .value as typeof draft.design.fonts.body),
              )
            }
          >
            {fontOptions(template.design.fonts.body)}
          </select>
        </label>
      </div>

      {(
        [
          [
            'buttonStyle',
            'Buttons',
            template.design.buttonStyles,
            { pill: 'Pill', rounded: 'Rounded', square: 'Square' },
          ],
          [
            'spacing',
            'Spacing',
            template.design.spacing,
            { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious' },
          ],
        ] as const
      ).map(([key, label, options, names]) => (
        <fieldset key={key} className="grid gap-2">
          <legend className="text-sm font-semibold text-ink">{label}</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <label
                key={option}
                className={cx(
                  'cursor-pointer rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-blue',
                  design[key] === option
                    ? 'border-brand-indigo bg-indigo-50 font-semibold text-brand-indigo'
                    : 'border-slate-300',
                )}
              >
                <input
                  type="radio"
                  name={key}
                  className="sr-only"
                  value={option}
                  checked={design[key] === option}
                  onChange={() =>
                    update(
                      (draft) => void ((draft.design as Record<string, unknown>)[key] = option),
                    )
                  }
                />
                {(names as Record<string, string>)[option]}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
