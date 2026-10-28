import { describe, expect, it } from 'vitest';
import { websiteConfigSchema, type WebsiteConfigInput } from './config';
import { imageSchema, isSafeLink } from './primitives';
import { sectionSchema, sectionTypes } from './sections';
import {
  checkAgainstTemplate,
  configSchemaFor,
  defineTemplate,
  startingConfig,
  type TemplateDefinition,
} from './template';

/** A small made-up design, not the real Portfolio demo (that comes with its approved brief). */
function fixtureConfig(): WebsiteConfigInput {
  return {
    schemaVersion: 1,
    template: { key: 'portfolio', version: 1 },
    site: { name: 'Test Person', tagline: 'Designer' },
    design: {
      theme: 'light',
      colors: {
        primary: '#1F6FEB',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f6f8fa',
        text: '#111827',
      },
      fonts: { heading: 'sora', body: 'inter' },
      buttonStyle: 'rounded',
      spacing: 'comfortable',
    },
    pages: [
      {
        id: 'home',
        type: 'home',
        title: 'Home',
        slug: '',
        enabled: true,
        showInNav: true,
        sections: [
          { id: 'header', type: 'header', variant: 'minimal', enabled: true, content: {} },
          {
            id: 'hero',
            type: 'hero',
            variant: 'split',
            enabled: true,
            content: {
              heading: 'Hello',
              primaryAction: { label: 'See my work', href: '#projects' },
              image: { src: '/demo/portfolio/portrait.webp', alt: 'An illustrated portrait' },
            },
          },
          {
            id: 'skills',
            type: 'skills',
            variant: 'chips',
            enabled: true,
            content: {
              heading: 'Skills',
              groups: [{ id: 'design', name: 'Design', skills: [{ id: 'figma', name: 'Figma' }] }],
            },
          },
          {
            id: 'footer',
            type: 'footer',
            variant: 'simple',
            enabled: true,
            content: { showSocial: true },
          },
        ],
      },
    ],
    contact: { email: 'hello@example.com' },
    social: [{ network: 'github', url: 'https://github.com/example' }],
  };
}

function fixtureTemplate(overrides: Partial<TemplateDefinition> = {}): TemplateDefinition {
  return {
    key: 'portfolio',
    version: 1,
    name: 'Test template',
    categories: ['personal-portfolio'],
    pages: [{ type: 'home', required: true, sections: ['header', 'hero', 'skills', 'footer'] }],
    sections: {
      header: { required: true, variants: ['minimal'] },
      hero: { required: true, variants: ['split', 'centered'] },
      skills: { required: false, variants: ['chips', 'bars'], maxItems: 3 },
      footer: { required: true, variants: ['simple'] },
    },
    design: {
      themes: [
        {
          key: 'light',
          name: 'Light',
          colors: {
            primary: '#1f6feb',
            accent: '#f59e0b',
            background: '#ffffff',
            surface: '#f6f8fa',
            text: '#111827',
          },
        },
      ],
      fonts: { heading: ['sora'], body: ['inter'] },
      buttonStyles: ['rounded', 'pill'],
      spacing: ['comfortable'],
    },
    defaultConfig: fixtureConfig(),
    ...overrides,
  };
}

/** Parses a changed copy of the fixture, then lists the template issues by path. */
function issuesAfter(change: (config: ReturnType<typeof fixtureConfig>) => void) {
  const input = fixtureConfig();
  change(input);
  const config = websiteConfigSchema.parse(input);
  return checkAgainstTemplate(config, fixtureTemplate()).map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
}

describe('links and images (layer 1)', () => {
  it('allows web, email, phone, in-page and same-site links', () => {
    for (const href of [
      'https://example.com/work',
      'http://example.com',
      'mailto:hello@example.com',
      'tel:+91 98866 07720',
      '#projects',
      '/work',
    ]) {
      expect(isSafeLink(href), href).toBe(true);
    }
  });

  it('refuses links that could run a script or go nowhere sensible', () => {
    for (const href of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      ' javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:x',
      '//evil.example',
      'file:///etc/passwd',
      'mailto:not-an-email',
      '#',
      'https://',
    ]) {
      expect(isSafeLink(href), href).toBe(false);
    }
  });

  it('needs an image description unless the image is marked decorative', () => {
    expect(imageSchema.safeParse({ src: '/a.webp', alt: '' }).success).toBe(false);
    expect(imageSchema.safeParse({ src: '/a.webp', alt: '', decorative: true }).success).toBe(true);
    expect(imageSchema.safeParse({ src: '/a.webp', alt: 'A desk' }).success).toBe(true);
  });

  it('takes images only from this site or https', () => {
    for (const src of [
      '//evil.example/a.png',
      'http://example.com/a.png',
      'data:image/png;base64,AA',
      '/a.svg',
      '/a',
    ]) {
      expect(imageSchema.safeParse({ src, alt: 'x' }).success, src).toBe(false);
    }
    expect(imageSchema.safeParse({ src: 'https://example.com/a.jpg', alt: 'x' }).success).toBe(
      true,
    );
  });
});

describe('the configuration structure (layer 1)', () => {
  it('accepts a complete design, and stores colours in lower case', () => {
    const config = websiteConfigSchema.parse(fixtureConfig());
    expect(config.design.colors.primary).toBe('#1f6feb');
  });

  it('knows every section type', () => {
    const covered = sectionSchema.options.map((option) => option.shape.type.value);
    expect(covered.sort()).toEqual([...sectionTypes].sort());
  });

  it('checks each section’s content by its type', () => {
    const input = fixtureConfig();
    // A skills section with the hero's content.
    input.pages[0]!.sections[2] = {
      id: 'skills',
      type: 'skills',
      variant: 'chips',
      enabled: true,
      content: { heading: 'Skills' } as never,
    };
    const result = websiteConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['pages', 0, 'sections', 2, 'content', 'groups']);
  });

  it('refuses unsafe links inside sections', () => {
    const input = fixtureConfig();
    const hero = input.pages[0]!.sections[1] as { content: { primaryAction: { href: string } } };
    hero.content.primaryAction.href = 'javascript:alert(document.cookie)';
    expect(websiteConfigSchema.safeParse(input).success).toBe(false);
  });

  it('only lets a social link point at its own network', () => {
    const input = fixtureConfig();
    input.social = [{ network: 'linkedin', url: 'https://evil.example/linkedin.com' }];
    expect(websiteConfigSchema.safeParse(input).success).toBe(false);
    input.social = [{ network: 'linkedin', url: 'https://www.linkedin.com/in/example' }];
    expect(websiteConfigSchema.safeParse(input).success).toBe(true);
  });

  it('refuses text that is empty or too long', () => {
    const input = fixtureConfig();
    input.site.name = '   ';
    expect(websiteConfigSchema.safeParse(input).success).toBe(false);
    input.site.name = 'x'.repeat(61);
    expect(websiteConfigSchema.safeParse(input).success).toBe(false);
  });
});

describe('the template rules (layer 2)', () => {
  it('accepts a design that keeps to the template', () => {
    expect(issuesAfter(() => undefined)).toEqual([]);
  });

  it('keeps the design to the template’s themes, fonts, buttons and spacing', () => {
    expect(
      issuesAfter((config) => {
        config.design.theme = 'neon';
        config.design.fonts.heading = 'inter';
        config.design.buttonStyle = 'square';
        config.design.spacing = 'spacious';
      }),
    ).toEqual([
      'design.theme: Choose one of this template’s colour themes',
      'design.fonts.heading: Choose one of this template’s heading fonts',
      'design.buttonStyle: Choose one of this template’s button styles',
      'design.spacing: Choose one of this template’s spacing options',
    ]);
  });

  it('allows only the template’s sections and layouts on a page', () => {
    const issues = issuesAfter((config) => {
      config.pages[0]!.sections[1]!.variant = 'diagonal';
      config.pages[0]!.sections.push({
        id: 'about',
        type: 'about',
        variant: 'simple',
        enabled: true,
        content: { heading: 'About', paragraphs: ['Hi'] },
      });
    });
    expect(issues).toEqual([
      'pages.0.sections.1.variant: Choose one of this section’s layouts',
      'pages.0.sections.4.type: This page can’t hold a section of this kind',
    ]);
  });

  it('needs the required sections, switched on', () => {
    expect(
      issuesAfter((config) => {
        config.pages[0]!.sections[1]!.enabled = false;
        config.pages[0]!.sections.splice(3, 1);
      }),
    ).toEqual([
      'pages.0.sections: This page needs its hero section, switched on',
      'pages.0.sections: This page needs its footer section, switched on',
    ]);
  });

  it('keeps lists within the template’s limits', () => {
    const issues = issuesAfter((config) => {
      const skills = config.pages[0]!.sections[2] as {
        content: { groups: { skills: { id: string; name: string }[] }[] };
      };
      skills.content.groups[0]!.skills = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id }));
    });
    expect(issues).toEqual(['pages.0.sections.2.content: This section can hold at most 3 items']);
  });

  it('checks page addresses, ids and the navigation', () => {
    expect(
      issuesAfter((config) => {
        config.pages[0]!.slug = 'home';
        config.pages[0]!.showInNav = false;
        config.pages[0]!.sections[3]!.id = 'hero';
      }),
    ).toEqual([
      'pages.0.slug: The home page has no address',
      'pages.0.sections.3.id: Two sections on this page have the same id',
      'pages: At least one page must be in the navigation',
    ]);
  });

  it('needs the required pages', () => {
    expect(
      issuesAfter((config) => {
        config.pages[0]!.enabled = false;
      }),
    ).toContain('pages: The home page is required');
  });

  it('refuses a design for another template, or a newer version', () => {
    expect(
      issuesAfter((config) => {
        config.template = { key: 'business', version: 2 };
      }),
    ).toEqual([
      'template.key: This design is for the "business" template',
      'template.version: This design was made with a newer version of the template',
    ]);
  });

  it('runs both layers as one schema, as the API does', () => {
    const schema = configSchemaFor(fixtureTemplate());
    expect(schema.safeParse(fixtureConfig()).success).toBe(true);
    const wrong = fixtureConfig();
    wrong.design.theme = 'neon';
    expect(schema.safeParse(wrong).error?.issues[0]?.path).toEqual(['design', 'theme']);
  });
});

describe('defining a template', () => {
  it('refuses a template whose own demo breaks its rules', () => {
    const broken = fixtureConfig();
    broken.design.spacing = 'compact';
    expect(() => defineTemplate(fixtureTemplate({ defaultConfig: broken }))).toThrow(
      /portfolio template's demo is not valid:\ndesign\.spacing/,
    );
  });

  it('starts a new design from a copy of the demo, never the demo itself', () => {
    const template = defineTemplate(fixtureTemplate());
    const draft = startingConfig(template);
    expect(draft).toEqual(template.parsedDefault);
    draft.site.name = 'Changed';
    expect(template.parsedDefault.site.name).toBe('Test Person');
  });
});
