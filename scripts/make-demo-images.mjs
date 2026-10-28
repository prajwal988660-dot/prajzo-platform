/**
 * Draws the pictures the live demos use (D-014: illustrations, never a real person's photo) and
 * writes them as WebP into apps/web/public/demo/<template>/. They are made from the shapes below,
 * so they can be made again, the same way, at any time. Run it with: npm run demo:images
 *
 * The colours are soft and mid-toned, so the pictures sit well on every look of a template, light
 * or dark.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const palette = {
  paper: '#e9edf3',
  slate: '#5d6fb3',
  coral: '#e48a6a',
  sand: '#efd3a6',
  teal: '#69ae9f',
  ink: '#2b3242',
};

/** Each picture: its file, size, and SVG drawing. */
const portfolio = [
  {
    file: 'portrait.webp',
    width: 640,
    height: 800,
    svg: `
      <rect width="640" height="800" fill="${palette.paper}"/>
      <circle cx="520" cy="130" r="70" fill="${palette.sand}"/>
      <path d="M90 800 C 110 600, 220 540, 320 540 C 420 540, 530 600, 550 800 Z" fill="${palette.slate}"/>
      <rect x="282" y="430" width="76" height="120" rx="30" fill="${palette.coral}"/>
      <circle cx="320" cy="350" r="120" fill="${palette.coral}"/>
      <path d="M196 340 C 190 230, 270 190, 330 200 C 410 205, 455 260, 444 340 C 420 290, 360 270, 300 280 C 250 288, 215 310, 196 340 Z" fill="${palette.ink}"/>
      <path d="M240 690 L 400 690" stroke="${palette.paper}" stroke-width="10" stroke-linecap="round" opacity="0.5"/>`,
  },
  {
    file: 'project-ledger.webp',
    width: 960,
    height: 540,
    svg: `
      <rect width="960" height="540" fill="${palette.paper}"/>
      <rect x="330" y="50" width="300" height="490" rx="40" fill="${palette.ink}"/>
      <rect x="350" y="80" width="260" height="440" rx="24" fill="#ffffff"/>
      <rect x="375" y="115" width="210" height="70" rx="14" fill="${palette.slate}"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="375" y="${210 + i * 62}" width="210" height="44" rx="10" fill="${i % 2 ? palette.sand : palette.paper}"/>`).join('')}
      <circle cx="170" cy="380" r="90" fill="${palette.teal}" opacity="0.8"/>
      <circle cx="800" cy="150" r="60" fill="${palette.coral}" opacity="0.85"/>`,
  },
  {
    file: 'project-commute.webp',
    width: 960,
    height: 540,
    svg: `
      <rect width="960" height="540" fill="${palette.paper}"/>
      <path d="M-20 400 C 200 300, 300 460, 520 360 S 860 220, 990 300" stroke="${palette.slate}" stroke-width="26" fill="none" stroke-linecap="round"/>
      <path d="M-20 200 C 160 260, 320 120, 520 190 S 820 330, 990 160" stroke="${palette.sand}" stroke-width="18" fill="none" stroke-linecap="round"/>
      ${[160, 420, 700].map((x, i) => `<circle cx="${x}" cy="${[330, 372, 260][i]}" r="26" fill="#ffffff" stroke="${palette.ink}" stroke-width="10"/>`).join('')}
      <rect x="610" y="70" width="240" height="96" rx="18" fill="${palette.coral}"/>
      <rect x="636" y="100" width="150" height="14" rx="7" fill="#ffffff" opacity="0.9"/>
      <rect x="636" y="128" width="100" height="14" rx="7" fill="#ffffff" opacity="0.6"/>`,
  },
  {
    file: 'project-walks.webp',
    width: 960,
    height: 540,
    svg: `
      <rect width="960" height="540" fill="${palette.sand}"/>
      <circle cx="740" cy="140" r="80" fill="${palette.coral}"/>
      <path d="M0 540 L 0 360 Q 150 250 300 360 T 600 340 T 960 330 L 960 540 Z" fill="${palette.teal}"/>
      <rect x="230" y="210" width="220" height="200" fill="${palette.ink}"/>
      <path d="M210 215 L 340 120 L 470 215 Z" fill="${palette.ink}"/>
      ${[0, 1, 2].map((i) => `<rect x="${262 + i * 60}" y="270" width="36" height="140" rx="18" fill="${palette.sand}"/>`).join('')}
      <path d="M0 540 L 0 450 Q 240 400 480 460 T 960 430 L 960 540 Z" fill="${palette.slate}"/>`,
  },
  {
    file: 'project-queue.webp',
    width: 960,
    height: 540,
    svg: `
      <rect width="960" height="540" fill="${palette.paper}"/>
      <rect x="120" y="70" width="460" height="300" rx="24" fill="${palette.ink}"/>
      <rect x="150" y="100" width="400" height="80" rx="14" fill="${palette.teal}"/>
      <rect x="150" y="200" width="190" height="140" rx="14" fill="${palette.slate}"/>
      <rect x="360" y="200" width="190" height="140" rx="14" fill="${palette.coral}"/>
      <rect x="320" y="370" width="60" height="90" fill="${palette.ink}"/>
      <rect x="230" y="455" width="240" height="24" rx="12" fill="${palette.ink}"/>
      ${[0, 1, 2].map((i) => `<circle cx="${680 + i * 80}" cy="300" r="34" fill="${[palette.sand, palette.coral, palette.slate][i]}"/><rect x="${650 + i * 80}" y="340" width="60" height="120" rx="30" fill="${[palette.sand, palette.coral, palette.slate][i]}"/>`).join('')}`,
  },
];

/** Demo 2: a print and signage studio (all made up). */
const business = [
  {
    file: 'studio.webp',
    width: 960,
    height: 720,
    svg: `
      <rect width="960" height="720" fill="${palette.paper}"/>
      <rect x="0" y="560" width="960" height="160" fill="${palette.sand}"/>
      <rect x="120" y="140" width="720" height="250" rx="22" fill="${palette.ink}"/>
      <rect x="150" y="170" width="660" height="190" rx="14" fill="${palette.teal}"/>
      <rect x="200" y="215" width="380" height="44" rx="10" fill="#ffffff"/>
      <rect x="200" y="280" width="250" height="28" rx="8" fill="#ffffff" opacity="0.7"/>
      <circle cx="700" cy="265" r="58" fill="${palette.coral}"/>
      <rect x="250" y="390" width="22" height="170" fill="${palette.ink}"/>
      <rect x="688" y="390" width="22" height="170" fill="${palette.ink}"/>
      <rect x="380" y="430" width="200" height="130" rx="12" fill="${palette.slate}"/>
      <rect x="405" y="455" width="150" height="16" rx="8" fill="#ffffff" opacity="0.85"/>
      <rect x="405" y="485" width="100" height="16" rx="8" fill="#ffffff" opacity="0.6"/>`,
  },
  ...[
    ['gallery-bakery.webp', palette.coral, palette.sand, 'circle'],
    ['gallery-clinic.webp', palette.teal, '#ffffff', 'cross'],
    ['gallery-banner.webp', palette.slate, palette.sand, 'flag'],
    ['gallery-cards.webp', palette.sand, palette.ink, 'cards'],
  ].map(([file, main, detail, shape]) => ({
    file,
    width: 600,
    height: 600,
    svg: `
      <rect width="600" height="600" fill="${palette.paper}"/>
      ${
        shape === 'circle'
          ? `<rect x="90" y="150" width="420" height="200" rx="24" fill="${palette.ink}"/><circle cx="300" cy="250" r="70" fill="${main}"/><circle cx="300" cy="250" r="30" fill="${detail}"/><rect x="150" y="380" width="300" height="140" rx="16" fill="${detail}"/>`
          : shape === 'cross'
            ? `<rect x="100" y="100" width="400" height="400" rx="30" fill="${main}"/><rect x="265" y="190" width="70" height="220" rx="12" fill="${detail}"/><rect x="190" y="265" width="220" height="70" rx="12" fill="${detail}"/>`
            : shape === 'flag'
              ? `<rect x="120" y="80" width="18" height="460" fill="${palette.ink}"/><rect x="462" y="80" width="18" height="460" fill="${palette.ink}"/><rect x="138" y="110" width="324" height="200" fill="${main}"/><rect x="170" y="160" width="200" height="30" rx="10" fill="${detail}"/><rect x="170" y="215" width="140" height="22" rx="10" fill="${detail}" opacity="0.7"/>`
              : `<rect x="110" y="170" width="300" height="190" rx="16" fill="${main}" transform="rotate(-8 260 265)"/><rect x="190" y="240" width="300" height="190" rx="16" fill="${detail}"/><rect x="220" y="280" width="120" height="18" rx="9" fill="${palette.sand}"/><rect x="220" y="315" width="200" height="14" rx="7" fill="#ffffff" opacity="0.7"/>`
      }`,
  })),
];

const sets = { portfolio, business };

// The installed Chrome on this PC (as the tests use); the downloaded one on GitHub.
const browser = await chromium.launch(process.env.CI ? {} : { channel: 'chrome' });
try {
  const page = await browser.newPage();
  for (const [template, pictures] of Object.entries(sets)) {
    const dir = path.join(root, 'apps/web/public/demo', template);
    mkdirSync(dir, { recursive: true });
    for (const picture of pictures) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${picture.width}" height="${picture.height}" viewBox="0 0 ${picture.width} ${picture.height}">${picture.svg}</svg>`;
      const base64 = await page.evaluate(
        async ({ svg, width, height }) => {
          const image = new Image();
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(image, 0, 0);
          return canvas.toDataURL('image/webp', 0.86).split(',')[1];
        },
        { svg, width: picture.width, height: picture.height },
      );
      const target = path.join(dir, picture.file);
      writeFileSync(target, Buffer.from(base64, 'base64'));
      console.log(
        `${path.relative(root, target)}  ${String(Math.round(Buffer.byteLength(base64, 'base64') / 1024))} KB`,
      );
    }
  }
} finally {
  await browser.close();
}
