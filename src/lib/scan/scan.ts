// Deep imports keep the other barcode formats in this library out of the bundle.
import BinaryBitmap from '@zxing/library/esm/core/BinaryBitmap';
import HybridBinarizer from '@zxing/library/esm/core/common/HybridBinarizer';
import DecodeHintType from '@zxing/library/esm/core/DecodeHintType';
import QRCodeReader from '@zxing/library/esm/core/qrcode/QRCodeReader';
import RGBLuminanceSource from '@zxing/library/esm/core/RGBLuminanceSource';
import type { BuildResult } from '../coaster/build';
import { luminance } from '../coaster/settings';
import { SCALE, type Shape } from '../geometry/shape';

const PIXELS_PER_MODULE = 6;
const MAX_WIDTH = 1600;
/** Gray stands in for whatever surface the coaster sits on. */
const SURROUNDINGS = 128;

/** Rasterizes shapes centered in a size × size millimeter square with a nonzero scanline fill; one flag per pixel. */
export function rasterize(shapes: Shape[], size: number, pxPerMm: number): { width: number; filled: Uint8Array } {
  const width = Math.ceil(size * pxPerMm);
  const filled = new Uint8Array(width * width);
  const edges: [number, number, number, number][] = [];
  for (const shape of shapes)
    for (const path of shape)
      for (let i = 0; i < path.length; i++) {
        const a = path[i];
        const b = path[(i + 1) % path.length];
        edges.push([a.x / SCALE, a.y / SCALE, b.x / SCALE, b.y / SCALE]);
      }
  for (let row = 0; row < width; row++) {
    const y = size / 2 - (row + 0.5) / pxPerMm;
    const crossings: [number, number][] = [];
    for (const [x0, y0, x1, y1] of edges) {
      if (y0 <= y === y1 <= y) continue;
      crossings.push([x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
    }
    crossings.sort((p, q) => p[0] - q[0]);
    let winding = 0;
    for (let i = 0; i < crossings.length; i++) {
      winding += crossings[i][1];
      if (winding === 0 || i + 1 >= crossings.length) continue;
      const from = Math.max(0, Math.ceil((crossings[i][0] + size / 2) * pxPerMm - 0.5));
      const to = Math.min(width - 1, Math.floor((crossings[i + 1][0] + size / 2) * pxPerMm - 0.5));
      for (let col = from; col <= to; col++) filled[row * width + col] = 1;
    }
  }
  return { width, filled };
}

/**
 * Renders the coaster top in grayscale from the real filament colors, the way a camera would see it,
 * and decodes it. Returns the decoded text, or null when the code cannot be read.
 */
export function scanCoaster(result: BuildResult, slots: string[]): string | null {
  if (!result.qr) return null;
  const pxPerMm = Math.min(PIXELS_PER_MODULE / result.qr.moduleSize, MAX_WIDTH / result.size);
  let image: { width: number; gray: Uint8ClampedArray } | null = null;
  for (const region of result.regions) {
    const { width, filled } = rasterize([region.shape], result.size, pxPerMm);
    image ??= { width, gray: new Uint8ClampedArray(width * width).fill(SURROUNDINGS) };
    const value = Math.round(luminance(slots[region.slot]) * 255);
    for (let i = 0; i < filled.length; i++) if (filled[i]) image.gray[i] = value;
  }
  if (!image) return null;
  // Most phone cameras also read light-on-dark codes, so try the inverted image too.
  return (
    decode(image.gray, image.width) ??
    decode(
      image.gray.map((v) => 255 - v),
      image.width,
    )
  );
}

function decode(gray: Uint8ClampedArray, width: number): string | null {
  try {
    const source = new RGBLuminanceSource(gray, width, width);
    const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
    return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText();
  } catch {
    return null;
  }
}
