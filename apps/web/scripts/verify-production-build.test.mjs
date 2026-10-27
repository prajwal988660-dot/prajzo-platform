import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkProductionBuild } from './verify-production-build.mjs';

/** Code as a minifier writes it: one very long line. */
const minifiedScript = `(()=>{${'a=1;b=2;'.repeat(600)}})();`;
const minifiedStyle = `.a{color:red}${'.b{margin:0}'.repeat(400)}`;
/** The start of a PNG file of this size (all the check reads). */
const png = (width, height) => {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
};

/** The page the web app is built from, as the build leaves it. */
const pageShell = `<!doctype html>
<html><head>
<!--page-head-->
<title>Prajzo</title>
<!--/page-head-->
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<script type="module" crossorigin src="/assets/index-Ab12Cd34.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-Ef56Gh78.css">
<link rel="preload" as="font" type="font/woff2" crossorigin="" href="/assets/inter-latin-wght-normal-Dx4kXJAl.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin="" href="/assets/sora-latin-wght-normal-Ds5lXJAl.woff2">
</head><body><div id="root"></div></body></html>`;

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
    write('index.html', pageShell);
    write('assets/index-Ab12Cd34.js', minifiedScript);
    write('assets/index-Ef56Gh78.css', minifiedStyle);
    write('assets/inter-latin-wght-normal-Dx4kXJAl.woff2', 'font');
    write('assets/sora-latin-wght-normal-Ds5lXJAl.woff2', 'font');
    write('favicon.ico', 'ico');
    write('apple-touch-icon.png', png(180, 180));
    write('icon-192.png', png(192, 192));
    write('icon-512.png', png(512, 512));
    write('og-image.png', png(1200, 630));
    write(
      'site.webmanifest',
      JSON.stringify({
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      }),
    );
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

  describe('the page shell the server builds every page from', () => {
    const brokenShell = (change) => {
      goodBuild();
      write('index.html', change(pageShell));
      return checkProductionBuild(dist);
    };

    it('fails when the block for each page title and description is missing, doubled or backwards', () => {
      const message = 'exactly one <!--page-head--> ... <!--/page-head--> block';
      expect(brokenShell((html) => html.replace('<!--page-head-->', ''))[0]).toContain(message);
      expect(brokenShell((html) => html.replace('<!--/page-head-->', ''))[0]).toContain(message);
      expect(
        brokenShell((html) =>
          html.replace('<!--page-head-->', '<!--page-head--><!--page-head-->'),
        )[0],
      ).toContain(message);
      expect(
        brokenShell((html) =>
          html
            .replace('<!--page-head-->', 'X')
            .replace('<!--/page-head-->', '<!--/page-head-->Y<!--page-head-->'),
        )[0],
      ).toContain(message);
    });

    it('fails when the page points to an icon, manifest, style or script that is not there', () => {
      goodBuild();
      rmSync(path.join(dist, 'favicon.ico'));
      rmSync(path.join(dist, 'site.webmanifest'));
      rmSync(path.join(dist, 'assets/index-Ef56Gh78.css'));
      const problems = checkProductionBuild(dist);
      expect(problems).toContain('index.html points to /favicon.ico, which is not in the build');
      expect(problems).toContain(
        'index.html points to /site.webmanifest, which is not in the build',
      );
      expect(problems).toContain(
        'index.html points to /assets/index-Ef56Gh78.css, which is not in the build',
      );
      expect(problems).toContain('site.webmanifest is missing from the build');
    });

    it('fails when a typeface is not preloaded', () => {
      expect(brokenShell((html) => html.replace(/<link rel="preload"[^>]*sora[^>]*>/, ''))).toEqual(
        ['index.html does not preload the sora typeface'],
      );
      expect(
        brokenShell((html) => html.replace(/<link rel="preload"[^>]*inter[^>]*>/, '')),
      ).toEqual(['index.html does not preload the inter typeface']);
    });

    it('fails when the sharing picture is missing, not a PNG, or the wrong size', () => {
      goodBuild();
      write('og-image.png', png(800, 400));
      expect(checkProductionBuild(dist)).toEqual(['og-image.png must be a 1200x630 PNG picture']);
      write('og-image.png', 'not a picture');
      expect(checkProductionBuild(dist)).toEqual(['og-image.png must be a 1200x630 PNG picture']);
      rmSync(path.join(dist, 'og-image.png'));
      expect(checkProductionBuild(dist)).toEqual([
        'og-image.png (the picture shown when a page is shared) is missing',
      ]);
    });

    it('fails when the manifest is broken, lists a missing icon, or an icon of another size', () => {
      goodBuild();
      write('site.webmanifest', '{ not json');
      expect(checkProductionBuild(dist)).toEqual(['site.webmanifest is not valid JSON']);

      write('site.webmanifest', JSON.stringify({ icons: [] }));
      expect(checkProductionBuild(dist)).toEqual(['site.webmanifest lists no icons']);

      write(
        'site.webmanifest',
        JSON.stringify({
          icons: [
            { src: '/icon-192.png', sizes: '512x512' },
            { src: '/icon-999.png', sizes: '999x999' },
          ],
        }),
      );
      expect(checkProductionBuild(dist)).toEqual([
        '/icon-192.png is 192x192, but site.webmanifest says 512x512',
        'site.webmanifest lists /icon-999.png, which is not a PNG in the build',
      ]);
    });
  });

  it('reports every problem, not just the first', () => {
    goodBuild();
    write('assets/index-Ab12Cd34.js.map', '{}');
    write('assets/old.js', readableScript);
    expect(checkProductionBuild(dist).length).toBeGreaterThanOrEqual(3);
  });
});
