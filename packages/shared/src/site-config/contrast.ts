/**
 * Colour contrast as WCAG 2 defines it. The builder uses it to warn when text would be hard to
 * read (architecture 5.3, layer 3: advice, never blocking), and the renderer to pick white or
 * dark text for buttons in the design's main colour.
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** The relative luminance of a colour written #rrggbb. */
export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** From 1 (no contrast) to 21 (black on white). 4.5 is the minimum for normal text. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** White or near-black, whichever reads better on this colour. */
export function readableTextOn(hex: string): '#ffffff' | '#111111' {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#111111') ? '#ffffff' : '#111111';
}
