import {
  buttonStyles,
  spacings,
  websiteConfigSchema,
  type ColorRole,
  type FontId,
  type PageType,
  type TemplateKey,
  type WebsiteConfig,
  type WebsiteConfigInput,
} from './config';
import { itemCount, type SectionType } from './sections';

/**
 * A template definition (architecture 5.2, D-005): what a template offers, and its default
 * configuration, which is exactly what its live demo shows (D-007). Definitions are written in
 * code and reviewed; admins only manage the catalogue entry around them.
 */
export type TemplateDefinition = {
  key: TemplateKey;
  version: number;
  name: string;
  /** Service catalogue category keys this template suits. */
  categories: string[];
  pages: {
    type: PageType;
    required: boolean;
    /** Section types this page may hold. */
    sections: SectionType[];
  }[];
  sections: Partial<
    Record<SectionType, { required: boolean; variants: string[]; maxItems?: number }>
  >;
  design: {
    themes: { key: string; name: string; colors: Record<ColorRole, string> }[];
    fonts: { heading: FontId[]; body: FontId[] };
    buttonStyles: (typeof buttonStyles)[number][];
    spacing: (typeof spacings)[number][];
  };
  defaultConfig: WebsiteConfigInput;
};

export type TemplateIssue = { path: (string | number)[]; message: string };

/**
 * Layer 2 of the checks (architecture 5.3): rules that depend on the template. Run after the
 * structure checks (layer 1), on every save and again on submission.
 */
export function checkAgainstTemplate(
  config: WebsiteConfig,
  template: TemplateDefinition,
): TemplateIssue[] {
  const issues: TemplateIssue[] = [];
  const add = (path: (string | number)[], message: string) => issues.push({ path, message });

  if (config.template.key !== template.key) {
    add(['template', 'key'], `This design is for the "${config.template.key}" template`);
  }
  if (config.template.version > template.version) {
    add(['template', 'version'], 'This design was made with a newer version of the template');
  }

  const { design } = template;
  if (!design.themes.some((theme) => theme.key === config.design.theme)) {
    add(['design', 'theme'], 'Choose one of this template’s colour themes');
  }
  if (!design.fonts.heading.includes(config.design.fonts.heading)) {
    add(['design', 'fonts', 'heading'], 'Choose one of this template’s heading fonts');
  }
  if (!design.fonts.body.includes(config.design.fonts.body)) {
    add(['design', 'fonts', 'body'], 'Choose one of this template’s text fonts');
  }
  if (!design.buttonStyles.includes(config.design.buttonStyle)) {
    add(['design', 'buttonStyle'], 'Choose one of this template’s button styles');
  }
  if (!design.spacing.includes(config.design.spacing)) {
    add(['design', 'spacing'], 'Choose one of this template’s spacing options');
  }

  const slugs = new Map<string, number>();
  const pageIds = new Set<string>();
  config.pages.forEach((page, pageIndex) => {
    const at = (...rest: (string | number)[]) => ['pages', pageIndex, ...rest];
    const rule = template.pages.find((candidate) => candidate.type === page.type);
    if (!rule) {
      add(at('type'), 'This template has no page of this kind');
      return;
    }
    if (pageIds.has(page.id)) add(at('id'), 'Two pages have the same id');
    pageIds.add(page.id);
    if (slugs.has(page.slug)) add(at('slug'), 'Two pages have the same address');
    slugs.set(page.slug, pageIndex);
    if (page.type === 'home' && page.slug !== '') add(at('slug'), 'The home page has no address');
    if (page.type !== 'home' && page.slug === '') add(at('slug'), 'Give this page an address');

    const sectionIds = new Set<string>();
    page.sections.forEach((section, sectionIndex) => {
      const where = (...rest: (string | number)[]) => at('sections', sectionIndex, ...rest);
      const sectionRule = template.sections[section.type];
      if (!sectionRule || !rule.sections.includes(section.type)) {
        add(where('type'), 'This page can’t hold a section of this kind');
        return;
      }
      if (sectionIds.has(section.id))
        add(where('id'), 'Two sections on this page have the same id');
      sectionIds.add(section.id);
      if (!sectionRule.variants.includes(section.variant)) {
        add(where('variant'), 'Choose one of this section’s layouts');
      }
      if (sectionRule.maxItems !== undefined && itemCount(section) > sectionRule.maxItems) {
        add(
          where('content'),
          `This section can hold at most ${String(sectionRule.maxItems)} items`,
        );
      }
    });

    if (page.enabled) {
      for (const [type, sectionRule] of Object.entries(template.sections)) {
        if (!sectionRule.required || !rule.sections.includes(type as SectionType)) continue;
        if (!page.sections.some((section) => section.type === type && section.enabled)) {
          add(at('sections'), `This page needs its ${type} section, switched on`);
        }
      }
    }
  });

  for (const rule of template.pages.filter((page) => page.required)) {
    if (!config.pages.some((page) => page.type === rule.type && page.enabled)) {
      add(['pages'], `The ${rule.type} page is required`);
    }
  }
  if (!config.pages.some((page) => page.enabled && page.showInNav)) {
    add(['pages'], 'At least one page must be in the navigation');
  }
  return issues;
}

/** Layers 1 and 2 together, as one schema: what the API runs on every save. */
export function configSchemaFor(template: TemplateDefinition) {
  return websiteConfigSchema.superRefine((config, ctx) => {
    for (const issue of checkAgainstTemplate(config, template)) {
      ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    }
  });
}

/**
 * Declares a template. Its default configuration is the live demo, so it must pass every check;
 * a mistake there fails as soon as the definition is loaded (and in its test), never in front
 * of a visitor.
 */
export function defineTemplate(definition: TemplateDefinition): TemplateDefinition & {
  defaultConfig: WebsiteConfigInput;
  parsedDefault: WebsiteConfig;
} {
  const parsed = configSchemaFor(definition).safeParse(definition.defaultConfig);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`The ${definition.key} template's demo is not valid:\n${problems.join('\n')}`);
  }
  return { ...definition, parsedDefault: parsed.data };
}

export type DefinedTemplate = ReturnType<typeof defineTemplate>;

/** A copy of a template's demo to start a new design from ("Customize This Design"). */
export function startingConfig(template: DefinedTemplate): WebsiteConfig {
  return structuredClone(template.parsedDefault);
}
