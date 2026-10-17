// Bundles the API into dist/server.js for production.
// Our own code (including @prajzo/shared, which is TypeScript source) is bundled in;
// npm dependencies stay external and are installed on the server with `npm ci --omit=dev`.
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies ?? {}).filter((name) => !name.startsWith('@prajzo/'));

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: [...external, ...external.map((name) => `${name}/*`)],
  logLevel: 'info',
});
