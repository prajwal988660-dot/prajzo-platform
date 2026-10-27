import { expect, test, type Page } from '@playwright/test';

/**
 * How much a first visit downloads, on the real production build (D-054). The numbers are what the
 * network carries (after compression), measured by the browser itself, so they fail if compression
 * stops working, an image is added at the wrong size, or a heavy library is pulled into the first
 * page. The budgets sit a little above today's numbers: they catch a regression, not small changes.
 */

type Kind = 'Document' | 'Script' | 'Stylesheet' | 'Font' | 'Image' | 'Fetch' | 'Other';

interface Download {
  url: string;
  kind: Kind;
  bytes: number;
  encoding: string | undefined;
}

/** Opens a page with an empty cache and reports every download. */
async function firstVisit(page: Page, address: string) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });

  const started = new Map<string, { url: string; kind: Kind }>();
  const encodings = new Map<string, string | undefined>();
  const sizes = new Map<string, number>();
  client.on('Network.requestWillBeSent', (event) => {
    const kind = (['Document', 'Script', 'Stylesheet', 'Font', 'Image', 'Fetch'] as const).find(
      (known) => known === event.type,
    );
    started.set(event.requestId, { url: event.request.url, kind: kind ?? 'Other' });
  });
  client.on('Network.responseReceived', (event) => {
    const headers = Object.fromEntries(
      Object.entries(event.response.headers).map(([name, value]) => [name.toLowerCase(), value]),
    );
    encodings.set(event.requestId, headers['content-encoding']);
  });
  client.on('Network.loadingFinished', (event) =>
    sizes.set(event.requestId, event.encodedDataLength),
  );

  await page.goto(address);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');

  const downloads: Download[] = [...started].map(([id, request]) => ({
    ...request,
    bytes: sizes.get(id) ?? 0,
    encoding: encodings.get(id),
  }));
  const kilobytes = (kind: Kind) =>
    downloads
      .filter((download) => download.kind === kind)
      .reduce((sum, download) => sum + download.bytes, 0) / 1024;
  return { downloads, kilobytes, total: downloads.reduce((sum, d) => sum + d.bytes, 0) / 1024 };
}

const summary = (downloads: Download[]) =>
  downloads
    .map(
      (d) =>
        `${d.kind} ${(d.bytes / 1024).toFixed(1)} KB ${d.encoding ?? '-'} ${new URL(d.url).pathname}`,
    )
    .join('\n');

test.describe('what a first visit downloads', () => {
  test('the home page stays light, with every script, style and page compressed', async ({
    page,
  }) => {
    const visit = await firstVisit(page, '/');
    console.log(
      `Home page, first visit: ${visit.total.toFixed(0)} KB in ${visit.downloads.length} requests\n${summary(visit.downloads)}`,
    );

    // Everything that is text is compressed (Brotli, as this browser asks for it).
    for (const download of visit.downloads.filter((item) =>
      ['Document', 'Script', 'Stylesheet'].includes(item.kind),
    )) {
      expect(download.encoding, download.url).toBe('br');
    }

    expect(visit.kilobytes('Script')).toBeLessThan(175); // 148 KB when measured
    expect(visit.kilobytes('Stylesheet')).toBeLessThan(14); // 10 KB
    expect(visit.kilobytes('Font')).toBeLessThan(100); // 82 KB
    expect(visit.kilobytes('Image')).toBeLessThan(30); // 11 KB
    expect(visit.total).toBeLessThan(320); // 270 KB
    expect(visit.downloads.length).toBeLessThan(30);
  });

  test('images are no bigger than they need to be: the logo is a small WebP', async ({ page }) => {
    const visit = await firstVisit(page, '/');
    const images = visit.downloads.filter((download) => download.kind === 'Image');
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.bytes / 1024, image.url).toBeLessThan(20);
    }
    const logo = images.find((image) => image.url.includes('prajzo-logo'));
    expect(logo?.url).toMatch(/\/assets\/prajzo-logo-[\w-]+\.webp$/);
  });

  test('the page with the most content, Services, does not load any extra typefaces or images', async ({
    page,
  }) => {
    const visit = await firstVisit(page, '/services');
    console.log(
      `Services, first visit: ${visit.total.toFixed(0)} KB in ${visit.downloads.length} requests`,
    );
    expect(visit.kilobytes('Font')).toBeLessThan(100);
    expect(visit.kilobytes('Image')).toBeLessThan(30);
    expect(visit.total).toBeLessThan(330); // 273 KB
  });

  test('a second visit loads almost nothing again, because files are named by their content', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');

    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    const fetched: string[] = [];
    client.on('Network.requestWillBeSent', (event) => {
      if (event.type !== 'Fetch' && event.type !== 'XHR') fetched.push(event.request.url);
    });
    const fromCache = new Set<string>();
    client.on('Network.requestServedFromCache', (event) => fromCache.add(event.requestId));

    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');

    const files = fetched.filter((url) => /\/assets\//.test(url));
    expect(files.length).toBeGreaterThan(0);
    // The shared scripts, styles, typefaces and the logo were kept from the first page.
    expect(fromCache.size).toBeGreaterThanOrEqual(files.length - 3);
  });
});
