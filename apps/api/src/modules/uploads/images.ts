import sharp from 'sharp';
import { AppError } from '../../lib/errors';

/** The largest picture accepted, before it is made smaller (D-012). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** The longest side a picture is kept at: big enough for a full-width photo on a large screen. */
const MAX_SIDE = 2000;

const accepted = new Set(['jpeg', 'png', 'webp']);

/**
 * Checks an uploaded picture by what its bytes really are (never its name or the type the
 * browser claims), and makes a clean copy (D-012):
 *
 * - only JPEG, PNG and WebP; SVG (which can carry scripts) and everything else is refused
 * - turned the right way up, then made no bigger than 2000 px on its longest side
 * - written out again as WebP, which leaves behind everything but the picture itself, including
 *   the location a phone records in a photo
 */
export async function cleanImage(
  input: Buffer,
): Promise<{ data: Buffer; width: number; height: number }> {
  if (input.length === 0) throw new AppError(400, 'BAD_REQUEST', 'Choose a picture to upload.');
  if (input.length > MAX_UPLOAD_BYTES) {
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Pictures can be at most 5 MB.');
  }

  let format: string | undefined;
  try {
    // limitInputPixels stops "decompression bombs": tiny files that unpack to huge pictures.
    format = (await sharp(input, { limitInputPixels: 50_000_000 }).metadata()).format;
  } catch {
    format = undefined;
  }
  if (!format || !accepted.has(format)) {
    throw new AppError(400, 'BAD_REQUEST', 'Upload a JPEG, PNG or WebP picture.');
  }

  try {
    const { data, info } = await sharp(input, { limitInputPixels: 50_000_000, animated: false })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new AppError(400, 'BAD_REQUEST', 'This picture could not be read. Try another file.');
  }
}
