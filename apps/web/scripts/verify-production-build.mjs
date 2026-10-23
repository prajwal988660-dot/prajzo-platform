/**
 * Checks the production build before anyone publishes it (D-037). It fails if the files that
 * visitors would download show the original code more easily than they should:
 *
 * - source maps (they rebuild the readable source from the minified files)
 * - code that only belongs to the development server
 * - CSS or JavaScript that isn't minified
 * - scripts or styles without a content hash in their name
 *
 * Runs after `vite build` (see the "build" script in package.json), so `npm run build` and
 * `npm run check` fail when any of this stops being true.
 */
import { readdirSync, readFileSync } from 'node:fs';
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
