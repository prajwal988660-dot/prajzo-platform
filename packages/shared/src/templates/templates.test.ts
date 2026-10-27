import { describe, expect, it } from 'vitest';
import { contrastRatio, readableTextOn } from '../site-config/contrast';
import { configSchemaFor, startingConfig } from '../site-config/template';
import { portfolioTemplate, templateFor, templates } from './index';

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('picks white or dark text, whichever reads better', () => {
    expect(readableTextOn('#2b50d8')).toBe('#ffffff');
    expect(readableTextOn('#f0b44c')).toBe('#111111');
  });
});

describe.each(Object.values(templates))('the $name template', (template) => {
  it('has a demo that passes every check (it is what /demo shows)', () => {
    expect(configSchemaFor(template).safeParse(template.defaultConfig).success).toBe(true);
  });

  it('opens the demo in one of its own themes, with that theme’s colours', () => {
    const theme = template.design.themes.find((t) => t.key === template.parsedDefault.design.theme);
    expect(theme?.colors).toEqual(template.parsedDefault.design.colors);
  });

  it('has readable text in every theme (WCAG AA)', () => {
    for (const { name, colors } of template.design.themes) {
      const checks = {
        'text on background': contrastRatio(colors.text, colors.background),
        'text on surface': contrastRatio(colors.text, colors.surface),
        'accent text on background': contrastRatio(colors.accent, colors.background),
        'button text on primary': contrastRatio(readableTextOn(colors.primary), colors.primary),
      };
      for (const [what, ratio] of Object.entries(checks)) {
        expect(ratio, `${name}: ${what}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('only uses pictures that are illustrations shipped with the site, each described', () => {
    const images = JSON.stringify(template.defaultConfig).match(/"src":"[^"]+"/g) ?? [];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(image).toMatch(new RegExp(`"src":"/demo/${template.key}/`));
  });

  it('uses example.com for every email address (D-014)', () => {
    const emails = JSON.stringify(template.defaultConfig).match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
    for (const email of emails) expect(email).toMatch(/@example\.com$/);
  });
});

describe('the template list', () => {
  it('finds a template by key, and nothing for an unknown or inherited key', () => {
    expect(templateFor('portfolio')).toBe(portfolioTemplate);
    expect(templateFor('nope')).toBeUndefined();
    expect(templateFor('toString')).toBeUndefined();
  });

  it('gives the builder a copy of the demo', () => {
    const copy = startingConfig(portfolioTemplate);
    copy.site.name = 'Someone else';
    expect(portfolioTemplate.parsedDefault.site.name).toBe('Tara Vaidya');
  });
});
