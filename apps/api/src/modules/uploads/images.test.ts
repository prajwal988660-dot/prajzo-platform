import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { cleanImage, MAX_UPLOAD_BYTES } from './images';

const picture = (format: 'jpeg' | 'png' | 'webp', width = 64, height = 48) =>
  sharp({ create: { width, height, channels: 3, background: '#2b50d8' } })
    .toFormat(format)
    .toBuffer();

describe('cleanImage (D-012)', () => {
  it.each(['jpeg', 'png', 'webp'] as const)(
    'accepts a %s picture and returns a clean WebP',
    async (format) => {
      const result = await cleanImage(await picture(format));
      expect((await sharp(result.data).metadata()).format).toBe('webp');
      expect([result.width, result.height]).toEqual([64, 48]);
    },
  );

  it('judges a file by its content, not its name: an SVG, text or a GIF is refused', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>',
    );
    const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } })
      .gif()
      .toBuffer();
    for (const input of [svg, gif, Buffer.from('just text, called photo.jpg')]) {
      await expect(cleanImage(input)).rejects.toMatchObject({
        status: 400,
        message: 'Upload a JPEG, PNG or WebP picture.',
      });
    }
  });

  it('refuses an empty file and one over 5 MB', async () => {
    await expect(cleanImage(Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
    await expect(cleanImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1))).rejects.toMatchObject({
      status: 413,
      message: 'Pictures can be at most 5 MB.',
    });
  });

  it('makes a large picture no bigger than 2000 px, keeping its shape, and never enlarges', async () => {
    const big = await cleanImage(await picture('png', 4000, 1000));
    expect([big.width, big.height]).toEqual([2000, 500]);
    const small = await cleanImage(await picture('png', 300, 200));
    expect([small.width, small.height]).toEqual([300, 200]);
  });

  it('leaves out what a camera writes into a photo, such as its location', async () => {
    const withExif = await sharp(await picture('jpeg'))
      .withExif({ IFD0: { Make: 'TestPhone', Copyright: 'Secret place' } })
      .jpeg()
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const cleaned = await cleanImage(withExif);
    const metadata = await sharp(cleaned.data).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(cleaned.data.includes(Buffer.from('Secret place'))).toBe(false);
  });

  it('turns a photo the right way up', async () => {
    // Stored sideways (64x48) with "rotate 90" in its EXIF: the clean copy is upright (48x64).
    const sideways = await sharp(await picture('jpeg'))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const cleaned = await cleanImage(sideways);
    expect([cleaned.width, cleaned.height]).toEqual([48, 64]);
  });
});
