/**
 * Checks the production build before anyone publishes it (D-037). It fails if the files that
 * visitors would download show the original code more easily than they should:
 *
 * - source maps (they rebuild the readable source from the minified files)
 * - code that only belongs to the development server
 * - CSS or JavaScript that isn't minified
 * - scripts or styles without a content hash in their name
 *
 * It also checks the page shell that the server builds every page from (D-053): the block the
 * server fills with each page's title and description is there, every icon, the manifest and
 * the font the page points to exists, the sharing picture is the right size, and both typefaces
 * are preloaded.
 *
 * Runs after `vite build` (see the "build" script in package.json), so `npm run build` and
 * `npm run check` fail when any of this stops being true.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Text that must never appear in a file sent to visitors. */
const forbiddenText = [
  {
    pattern: /sourceMappingURL=/,
    problem: 'points to a source map, which would show visitors the original code',
  },
  {
    pattern: /import\.meta\.hot|@vite\/client|\/@react-refresh/,
    problem: 'contains code that only belongs to the development server',
  },
  { pattern: /Prajzo UI foundation/, problem: 'contains the development-only design gallery' },
];

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

/** Minified code is a few very long lines; readable code is many short ones. */
function looksMinified(text) {
  if (text.length < 2000) return true; // a tiny file proves nothing either way
  return text.length / text.split('\n').length > 200;
}

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The width and height of a PNG file, or null if it isn't one. */
function pngSize(file) {
  const bytes = readFileSync(file);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngSignature)) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** The picture shown when a page is shared must be this size (see site-pages.ts, sharingImage). */
const sharingImageSize = { width: 1200, height: 630 };

/** Typefaces that every page uses, and so are downloaded together with the page's code. */
const preloadedFonts = [
  { name: 'inter', pattern: /inter-latin-wght-normal-/ },
  { name: 'sora', pattern: /sora-latin-wght-normal-/ },
];

/** What the server relies on in index.html, and the files that the page points to. */
function checkPageShell(distDir, html) {
  const problems = [];
  const fileFor = (address) => path.join(distDir, address.split(/[?#]/)[0].replace(/^\//, ''));
  const exists = (address) => existsSync(fileFor(address));

  const start = html.indexOf('<!--page-head-->');
  const end = html.indexOf('<!--/page-head-->');
  if (start < 0 || end < start || html.indexOf('<!--page-head-->', start + 1) >= 0) {
    problems.push(
      'index.html must have exactly one <!--page-head--> ... <!--/page-head--> block, which the server fills with each page title and description',
    );
  }

  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]);
  const attribute = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
  const preloaded = [];
  for (const tag of links) {
    const rel = attribute(tag, 'rel') ?? '';
    const href = attribute(tag, 'href');
    if (!href?.startsWith('/')) continue;
    if (/\b(?:icon|apple-touch-icon|manifest|stylesheet|modulepreload|preload)\b/.test(rel)) {
      if (!exists(href)) problems.push(`index.html points to ${href}, which is not in the build`);
      if (rel === 'preload' && attribute(tag, 'as') === 'font') preloaded.push(href);
    }
  }
  for (const { name, pattern } of preloadedFonts) {
    if (!preloaded.some((href) => pattern.test(href))) {
      problems.push(`index.html does not preload the ${name} typeface`);
    }
  }
  for (const [, source] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
    if (source.startsWith('/') && !exists(source)) {
      problems.push(`index.html points to ${source}, which is not in the build`);
    }
  }

  const sharing = path.join(distDir, 'og-image.png');
  if (!existsSync(sharing)) {
    problems.push('og-image.png (the picture shown when a page is shared) is missing');
  } else {
    const size = pngSize(sharing);
    if (!size || size.width !== sharingImageSize.width || size.height !== sharingImageSize.height) {
      problems.push(
        `og-image.png must be a ${sharingImageSize.width}x${sharingImageSize.height} PNG picture`,
      );
    }
  }

  const manifestFile = path.join(distDir, 'site.webmanifest');
  if (!existsSync(manifestFile)) {
    problems.push('site.webmanifest is missing from the build');
  } else {
    try {
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
      for (const icon of manifest.icons ?? []) {
        const [width, height] = String(icon.sizes).split('x').map(Number);
        const size = exists(icon.src) ? pngSize(fileFor(icon.src)) : null;
        if (!size)
          problems.push(`site.webmanifest lists ${icon.src}, which is not a PNG in the build`);
        else if (size.width !== width || size.height !== height) {
          problems.push(
            `${icon.src} is ${size.width}x${size.height}, but site.webmanifest says ${icon.sizes}`,
          );
        }
      }
      if (!manifest.icons?.length) problems.push('site.webmanifest lists no icons');
    } catch {
      problems.push('site.webmanifest is not valid JSON');
    }
  }
  return problems;
}

/** Returns what is wrong with a built web app (an empty list means it passes). */
export function checkProductionBuild(distDir) {
  let files;
  try {
    files = listFiles(distDir);
  } catch {
    return [`${distDir} was not found. Build the web app first (npm run build)`];
  }

  const problems = [];
  if (!files.includes(path.join(distDir, 'index.html'))) {
    problems.push('index.html is missing from the build');
  } else {
    problems.push(
      ...checkPageShell(distDir, readFileSync(path.join(distDir, 'index.html'), 'utf8')),
    );
  }

  for (const file of files) {
    const name = path.relative(distDir, file).split(path.sep).join('/');

    if (name.endsWith('.map')) {
      problems.push(`${name} is a source map, which would show visitors the original code`);
      continue;
    }
    if (!/\.(js|css|html)$/.test(name)) continue;

    const text = readFileSync(file, 'utf8');
    for (const { pattern, problem } of forbiddenText) {
      if (pattern.test(text)) problems.push(`${name} ${problem}`);
    }

    if (/\.(js|css)$/.test(name)) {
      if (!looksMinified(text)) problems.push(`${name} is not minified`);
      if (name.startsWith('assets/') && !/-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(name)) {
        problems.push(`${name} has no content hash in its name, so it can't be cached safely`);
      }
    }
  }
  return problems;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  const distDir = path.resolve(process.argv[2] ?? path.join(path.dirname(thisFile), '..', 'dist'));
  const problems = checkProductionBuild(distDir);
  if (problems.length > 0) {
    console.error('The production build is not ready to publish:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    `Production build check passed: ${listFiles(distDir).length} files, minified, content-hashed, no source maps, no development code.`,
  );
}
