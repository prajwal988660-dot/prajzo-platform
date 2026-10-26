/**
 * Makes every brand image the website needs from the original artwork (D-054), so they can be made
 * again, the same way, whenever the artwork changes:
 *
 *   assets/brand/prajzo-logo-original.png  (the full-size logo on a plain background)
 *   assets/brand/prajzo-logo-transparent.png  (the logo on a transparent background)
 *
 * It writes into apps/web/public:
 *
 *   favicon.ico, favicon-16x16.png, favicon-32x32.png, favicon-48x48.png   the tab icon
 *   apple-touch-icon.png                                                     iPhone/iPad home screen
 *   icon-192.png, icon-512.png, icon-maskable-512.png                       Android / install icons
 *   og-image.png                                                             the 1200x630 picture shown
 *                                                                            when a page is shared
 * and into apps/web/src/assets:
 *   prajzo-logo.webp                                                         the logo in the header, at
 *                                                                            twice the size it is shown
 *
 * Nothing here is drawn by hand: the mark is cut out of the original artwork and scaled with the
 * browser's own image scaling, then written out as PNG. Run it with: npm run brand:images
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'apps/web/public');
const assetsDir = path.join(root, 'apps/web/src/assets');
const base64Of = (file) => readFileSync(path.join(root, file)).toString('base64');

/** The tab icon, as an .ico file holding PNG pictures of several sizes. */
export function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
}

/**
 * Runs in the browser. Cuts the mark and the logo out of the original artwork and makes every
 * picture. Returns the pictures as base64 text.
 */
async function drawEverything({ original, transparentLogo, soraFont, interFont }) {
  const load = (source) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('An image could not be read'));
      image.src = source;
    });
  const canvasOf = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    return canvas;
  };
  const toBase64 = (canvas, type = 'image/png', quality) =>
    canvas.toDataURL(type, quality).split(',')[1];

  /** Scales a picture down in steps of at most half, which keeps edges clean. */
  const scaled = (source, width, height) => {
    let current = source;
    let w = source.width;
    let h = source.height;
    while (w / 2 > width) {
      w = Math.round(w / 2);
      h = Math.round(h / 2);
      const step = canvasOf(w, h);
      const stepContext = step.getContext('2d');
      stepContext.imageSmoothingQuality = 'high';
      stepContext.drawImage(current, 0, 0, w, h);
      current = step;
    }
    const result = canvasOf(width, height);
    const context = result.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(current, 0, 0, width, height);
    return result;
  };

  // ---- Find the mark and the wordmark in the original artwork.
  const originalImage = await load(`data:image/png;base64,${original}`);
  const W = originalImage.naturalWidth;
  const H = originalImage.naturalHeight;
  const sheet = canvasOf(W, H);
  const sheetContext = sheet.getContext('2d', { willReadFrequently: true });
  sheetContext.drawImage(originalImage, 0, 0);
  const pixels = sheetContext.getImageData(0, 0, W, H).data;
  const background = [pixels[0], pixels[1], pixels[2]];
  const distance = (i) =>
    Math.abs(pixels[i] - background[0]) +
    Math.abs(pixels[i + 1] - background[1]) +
    Math.abs(pixels[i + 2] - background[2]);
  const isInk = (x, y) => distance((y * W + x) * 4) > 60;

  // The logo sits in the middle band; ignore the corners (the original has a small watermark).
  const bandTop = Math.round(H * 0.25);
  const bandBottom = Math.round(H * 0.7);
  const occupied = new Array(W).fill(false);
  for (let x = 0; x < W; x += 1) {
    for (let y = bandTop; y < bandBottom; y += 1) {
      if (isInk(x, y)) {
        occupied[x] = true;
        break;
      }
    }
  }
  // Runs of columns with ink, separated by gaps of at least 8 pixels: the mark, then the wordmark.
  const runs = [];
  let current = null;
  let gap = 0;
  for (let x = 0; x < W; x += 1) {
    if (occupied[x]) {
      if (current === null) {
        current = { start: x, end: x };
        runs.push(current);
      } else {
        current.end = x;
      }
      gap = 0;
    } else if (current !== null) {
      gap += 1;
      if (gap >= 8) {
        current = null;
        gap = 0;
      }
    }
  }
  if (runs.length < 2)
    throw new Error(`Expected a mark and a wordmark, found ${runs.length} parts`);
  const markColumns = runs[0];
  const lastColumns = runs.at(-1);
  const rowsOf = (from, to) => {
    let top = H;
    let bottom = 0;
    for (let y = bandTop; y < bandBottom; y += 1) {
      for (let x = from; x <= to; x += 1) {
        if (isInk(x, y)) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          break;
        }
      }
    }
    return { top, bottom };
  };
  const markRows = rowsOf(markColumns.start, markColumns.end);
  const logoRows = rowsOf(markColumns.start, lastColumns.end);
  const markBox = {
    x: markColumns.start,
    y: markRows.top,
    w: markColumns.end - markColumns.start + 1,
    h: markRows.bottom - markRows.top + 1,
  };
  const logoBox = {
    x: markColumns.start,
    y: logoRows.top,
    w: lastColumns.end - markColumns.start + 1,
    h: logoRows.bottom - logoRows.top + 1,
  };

  /** Cuts a box out of the artwork and makes its background see-through, keeping soft edges. */
  const cutOut = (box) => {
    const canvas = canvasOf(box.w, box.h);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(sheet, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    const picture = context.getImageData(0, 0, box.w, box.h);
    const data = picture.data;
    for (let i = 0; i < data.length; i += 4) {
      // How much of each colour channel is "ink" rather than background; the strongest wins.
      const alpha = Math.max(
        (background[0] - data[i]) / background[0],
        (background[1] - data[i + 1]) / background[1],
        (background[2] - data[i + 2]) / background[2],
      );
      if (alpha < 0.04) {
        data[i + 3] = 0;
        continue;
      }
      const a = Math.min(1, alpha);
      // Undo the blending with the background, so edges don't keep a pale fringe.
      for (let c = 0; c < 3; c += 1) {
        const value = (data[i + c] - background[c] * (1 - a)) / a;
        data[i + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
      data[i + 3] = Math.round(a * 255);
    }
    context.putImageData(picture, 0, 0);
    return canvas;
  };
  const markPicture = cutOut(markBox);
  const logoPicture = cutOut(logoBox);

  /** The mark centred on a square, with room around it (a fraction of the side), on a colour or see-through. */
  const icon = (size, padding, fill) => {
    const canvas = canvasOf(size, size);
    const context = canvas.getContext('2d');
    if (fill) {
      context.fillStyle = fill;
      context.fillRect(0, 0, size, size);
    }
    const room = size * (1 - 2 * padding);
    const ratio = markPicture.width / markPicture.height;
    const width = ratio >= 1 ? room : room * ratio;
    const height = ratio >= 1 ? room / ratio : room;
    const small = scaled(markPicture, Math.round(width), Math.round(height));
    context.drawImage(small, (size - small.width) / 2, (size - small.height) / 2);
    return canvas;
  };

  const results = {
    'favicon-16x16.png': toBase64(icon(16, 0.04)),
    'favicon-32x32.png': toBase64(icon(32, 0.04)),
    'favicon-48x48.png': toBase64(icon(48, 0.04)),
    'apple-touch-icon.png': toBase64(icon(180, 0.17, '#ffffff')),
    'icon-192.png': toBase64(icon(192, 0.17, '#ffffff')),
    'icon-512.png': toBase64(icon(512, 0.17, '#ffffff')),
    // Android may cut this one into a circle or a squircle: keep the mark in the safe middle.
    'icon-maskable-512.png': toBase64(icon(512, 0.3, '#ffffff')),
  };

  // ---- The logo in the header: shown 28px tall (about 152px wide); made at twice that.
  const headerLogo = await load(`data:image/png;base64,${transparentLogo}`);
  const headerWidth = 320;
  const headerHeight = Math.round(
    (headerLogo.naturalHeight / headerLogo.naturalWidth) * headerWidth,
  );
  const headerCanvas = scaled(headerLogo, headerWidth, headerHeight);
  results['prajzo-logo.webp'] = toBase64(headerCanvas, 'image/webp', 0.92);
  results['prajzo-logo.size'] = `${headerWidth}x${headerHeight}`;

  // ---- The picture shown when a page is shared (1200x630).
  const ogLogo = scaled(
    logoPicture,
    640,
    Math.round((logoPicture.height / logoPicture.width) * 640),
  );
  const ogMark = scaled(
    markPicture,
    560,
    Math.round((markPicture.height / markPicture.width) * 560),
  );
  document.head.insertAdjacentHTML(
    'beforeend',
    `<style>
      @font-face { font-family: 'Sora'; font-weight: 100 800; src: url(data:font/woff2;base64,${soraFont}) format('woff2'); }
      @font-face { font-family: 'Inter'; font-weight: 100 900; src: url(data:font/woff2;base64,${interFont}) format('woff2'); }
      html, body { margin: 0; padding: 0; }
      #card { position: relative; width: 1200px; height: 630px; overflow: hidden;
        background: linear-gradient(135deg, #ffffff 0%, #f1f5fc 100%); }
      #card .mark { position: absolute; right: -110px; top: 40px; opacity: 0.1; }
      #card .logo { position: absolute; left: 84px; top: 130px; }
      #card .headline { position: absolute; left: 84px; top: 340px; width: 760px; margin: 0;
        font: 600 48px/1.18 Sora, sans-serif; color: #0a1b46; letter-spacing: -0.01em; }
      #card .subline { position: absolute; left: 84px; top: 478px; margin: 0;
        font: 500 29px/1.3 Inter, sans-serif; color: #475569; }
      #card .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 14px;
        background: linear-gradient(90deg, #04bbff, #0072f6 38%, #8b28c0 72%, #d02bdf); }
    </style>`,
  );
  document.body.innerHTML =
    '<div id="card"><img class="mark" alt=""><img class="logo" alt=""><p class="headline">Websites, web applications and digital solutions</p><p class="subline">Clear prices. A delivery date before work begins.</p><div class="bar"></div></div>';
  document.querySelector('.mark').src = ogMark.toDataURL('image/png');
  document.querySelector('.logo').src = ogLogo.toDataURL('image/png');
  await Promise.all(
    [...document.images].map((image) => (image.complete ? undefined : image.decode())),
  );
  await document.fonts.load('600 48px Sora');
  await document.fonts.load('500 29px Inter');
  await document.fonts.ready;

  results.boxes = JSON.stringify({ markBox, logoBox, runs: runs.length });
  return results;
}

async function main() {
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(assetsDir, { recursive: true });

  const browser = await chromium.launch(process.env.CI ? {} : { channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.goto('about:blank');
    const made = await page.evaluate(drawEverything, {
      original: base64Of('assets/brand/prajzo-logo-original.png'),
      transparentLogo: base64Of('assets/brand/prajzo-logo-transparent.png'),
      soraFont: base64Of(
        'node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2',
      ),
      interFont: base64Of(
        'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
      ),
    });
    const og = await page.locator('#card').screenshot({ type: 'png' });

    const write = (directory, name, data) => {
      writeFileSync(path.join(directory, name), data);
      console.log(`  ${name.padEnd(24)} ${String(data.length).padStart(7)} bytes`);
    };
    console.log(`Cut out of the artwork: ${made['boxes']}`);
    for (const name of [
      'favicon-16x16.png',
      'favicon-32x32.png',
      'favicon-48x48.png',
      'apple-touch-icon.png',
      'icon-192.png',
      'icon-512.png',
      'icon-maskable-512.png',
    ]) {
      write(publicDir, name, Buffer.from(made[name], 'base64'));
    }
    write(
      publicDir,
      'favicon.ico',
      buildIco(
        [16, 32, 48].map((size) => ({
          size,
          data: Buffer.from(made[`favicon-${size}x${size}.png`], 'base64'),
        })),
      ),
    );
    write(publicDir, 'og-image.png', og);
    write(assetsDir, 'prajzo-logo.webp', Buffer.from(made['prajzo-logo.webp'], 'base64'));
    console.log(`The header logo is ${made['prajzo-logo.size']} pixels.`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
