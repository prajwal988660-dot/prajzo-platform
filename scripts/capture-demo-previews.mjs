/**
 * Takes the preview picture of each live demo, so the Templates pages always show what the demo
 * really looks like (Phase 8). It photographs the top of each demo as a computer shows it and
 * writes apps/web/public/demo/<template>/preview.webp.
 *
 *   npm run host:local            (the website must be running)
 *   npm run demo:previews         (or: npm run demo:previews -- http://localhost:5173)
 *
 * Run it again whenever a demo's look changes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = process.argv[2] ?? 'http://localhost:8080';
const demos = ['portfolio', 'business', 'event'];

// The installed Chrome on this PC (as the tests use); the downloaded one on GitHub.
const browser = await chromium.launch(process.env.CI ? {} : { channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  for (const key of demos) {
    await page.goto(`${site}/demo/${key}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // The demo bar is Prajzo's, not part of the design: leave it out of the picture. (Removed
    // with a script; the site's content security policy rightly refuses injected styles.)
    await page.evaluate(() => document.querySelector('.demo-bar')?.remove());
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 800 } });
    const base64 = await page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 600;
      canvas.getContext('2d').drawImage(image, 0, 0, 960, 600);
      return canvas.toDataURL('image/webp', 0.84).split(',')[1];
    }, png.toString('base64'));
    const target = path.join(root, 'apps/web/public/demo', key, 'preview.webp');
    // A demo with no pictures of its own (Event) has no folder yet.
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(base64, 'base64'));
    console.log(
      `${path.relative(root, target)}  ${String(Math.round(Buffer.byteLength(base64, 'base64') / 1024))} KB`,
    );
  }
} finally {
  await browser.close();
}
