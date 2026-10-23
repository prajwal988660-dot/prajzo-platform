import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkProductionBuild } from './verify-production-build.mjs';

/** Code as a minifier writes it: one very long line. */
const minifiedScript = `(()=>{${'a=1;b=2;'.repeat(600)}})();`;
const minifiedStyle = `.a{color:red}${'.b{margin:0}'.repeat(400)}`;
/** Code as a person writes it: many short, indented lines. */
const readableScript = 'function example() {\n  const value = 1;\n  return value;\n}\n'.repeat(200);

describe('checkProductionBuild', () => {
  let dist;

  const write = (file, content) => {
    const full = path.join(dist, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  };

  const goodBuild = () => {
    write('index.html', '<!doctype html><title>Prajzo</title><div id="root"></div>');
    write('assets/index-Ab12Cd34.js', minifiedScript);
    write('assets/index-Ef56Gh78.css', minifiedStyle);
    write('assets/inter-latin-wght-normal-Dx4kXJAl.woff2', 'font');
    write('favicon.png', 'png');
  };

  beforeEach(() => {
    dist = mkdtempSync(path.join(tmpdir(), 'prajzo-build-check-'));
  });

  afterEach(() => {
    rmSync(dist, { recursive: true, force: true });
  });

  it('passes a minified, hashed build with no source maps', () => {
    goodBuild();
    expect(checkProductionBuild(dist)).toEqual([]);
  });

  it('says so when there is no build', () => {
    expect(checkProductionBuild(path.join(dist, 'missing'))[0]).toContain(
      'Build the web app first',
    );
  });

  it('fails when index.html is missing', () => {
    goodBuild();
    rmSync(path.join(dist, 'index.html'));
    expect(checkProductionBuild(dist)).toEqual(['index.html is missing from the build']);
  });

  it('fails on a source map file', () => {
    goodBuild();
    write('assets/index-Ab12Cd34.js.map', '{"version":3}');
    expect(checkProductionBuild(dist)).toEqual([
      'assets/index-Ab12Cd34.js.map is a source map, which would show visitors the original code',
    ]);
  });

  it('fails on a pointer to a source map, in a script or a style', () => {
    goodBuild();
    write('assets/index-Ab12Cd34.js', `${minifiedScript}\n//# sourceMappingURL=index.js.map`);
    write('assets/index-Ef56Gh78.css', `${minifiedStyle}\n/*# sourceMappingURL=index.css.map */`);
    const problems = checkProductionBuild(dist);
    expect(problems).toHaveLength(2);
    expect(problems.join('\n')).toContain('index-Ab12Cd34.js points to a source map');
    expect(problems.join('\n')).toContain('index-Ef56Gh78.css points to a source map');
  });

  it('fails on development-server code', () => {
    goodBuild();
    write('assets/index-Ab12Cd34.js', `${minifiedScript}import.meta.hot.accept();`);
    expect(checkProductionBuild(dist).join('\n')).toContain(
      'only belongs to the development server',
    );
  });

  it('fails when the development-only design gallery got in', () => {
    goodBuild();
    write('assets/Gallery-Zz99Yy88.js', `${minifiedScript}"Prajzo UI foundation"`);
    expect(checkProductionBuild(dist).join('\n')).toContain('development-only design gallery');
  });

  it('fails on a script or style that is not minified', () => {
    goodBuild();
    write('assets/index-Ab12Cd34.js', readableScript);
    write('assets/index-Ef56Gh78.css', '.a {\n  color: red;\n}\n'.repeat(300));
    const problems = checkProductionBuild(dist);
    expect(problems).toContain('assets/index-Ab12Cd34.js is not minified');
    expect(problems).toContain('assets/index-Ef56Gh78.css is not minified');
  });

  it('does not judge tiny files', () => {
    goodBuild();
    write('assets/small-Hh11Jj22.js', 'export{a};\nexport{b};\n');
    expect(checkProductionBuild(dist)).toEqual([]);
  });

  it('fails on a script or style without a content hash in its name', () => {
    goodBuild();
    write('assets/app.js', minifiedScript);
    write('assets/site.css', minifiedStyle);
    expect(checkProductionBuild(dist)).toEqual([
      "assets/app.js has no content hash in its name, so it can't be cached safely",
      "assets/site.css has no content hash in its name, so it can't be cached safely",
    ]);
  });

  it('reports every problem, not just the first', () => {
    goodBuild();
    write('assets/index-Ab12Cd34.js.map', '{}');
    write('assets/old.js', readableScript);
    expect(checkProductionBuild(dist).length).toBeGreaterThanOrEqual(3);
  });
});
