import { readableTextOn, type FontId, type SiteDesign } from '@prajzo/shared';
import type { CSSProperties } from 'react';

/**
 * A design's settings become CSS variables on the site's outer element (architecture 5.4), so a
 * new colour, typeface or button shape never needs a new component.
 */

/** The family name each typeface's @font-face uses, with fallbacks while it loads. */
export const fontStacks: Record<FontId, string> = {
  inter: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
  sora: "'Sora Variable', ui-sans-serif, system-ui, sans-serif",
  'bricolage-grotesque': "'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif",
  figtree: "'Figtree Variable', ui-sans-serif, system-ui, sans-serif",
  fraunces: "'Fraunces Variable', Georgia, 'Times New Roman', serif",
  manrope: "'Manrope Variable', ui-sans-serif, system-ui, sans-serif",
  'dm-serif-display': "'DM Serif Display', Georgia, 'Times New Roman', serif",
  'dm-sans': "'DM Sans Variable', ui-sans-serif, system-ui, sans-serif",
};

const buttonRadius = { pill: '999px', rounded: '0.5rem', square: '0' } as const;
const sectionGap = { compact: '3rem', comfortable: '4.5rem', spacious: '6.5rem' } as const;

export function designVariables(design: SiteDesign): CSSProperties {
  const { colors } = design;
  return {
    '--site-bg': colors.background,
    '--site-surface': colors.surface,
    '--site-text': colors.text,
    // Mixed from the design's own colours, so they follow any colour the customer picks.
    '--site-muted': `color-mix(in srgb, ${colors.text} 72%, ${colors.background})`,
    '--site-line': `color-mix(in srgb, ${colors.text} 14%, ${colors.background})`,
    '--site-primary': colors.primary,
    '--site-on-primary': readableTextOn(colors.primary),
    '--site-accent': colors.accent,
    '--site-font-heading': fontStacks[design.fonts.heading],
    '--site-font-body': fontStacks[design.fonts.body],
    '--site-radius-button': buttonRadius[design.buttonStyle],
    '--site-gap': sectionGap[design.spacing],
  } as CSSProperties;
}
