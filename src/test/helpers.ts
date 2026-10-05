import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';
import jsQR from 'jsqr';
import opentype, { type Font } from 'opentype.js';
import type { BuildAssets, BuildResult } from '../lib/coaster/build';
import { SCALE, type Shape } from '../lib/geometry/shape';
import type { LogoArt } from '../lib/logo/art';
import { BUNDLED_FONTS } from '../lib/text/fonts';

const require = createRequire(import.meta.url);
const fontCache = new Map<string, Font>();

export function loadFont(id: string): Font | undefined {
  if (!fontCache.has(id)) {
    const entry = BUNDLED_FONTS.find((f) => f.id === id);
    if (!entry) return undefined;
    const bytes = readFileSync(require.resolve(entry.file));
    fontCache.set(id, opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  }
  return fontCache.get(id);
}

/** Rasterizes regions with a nonzero scanline fill; returns one dark flag per pixel. */
export function rasterize(shapes: Shape[], size: number, pxPerMm: number): { width: number; dark: Uint8Array } {
  const width = Math.ceil(size * pxPerMm);
  const dark = new Uint8Array(width * width);
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
      for (let col = from; col <= to; col++) dark[row * width + col] = 1;
    }
  }
  return { width, dark };
}

/**
 * Decodes the code printed on the top of a coaster, treating every slot other than the base as ink.
 * Phone cameras are more forgiving than either library, so a read from either one counts.
 */
export function scanTop(result: BuildResult, size: number, baseSlot: number): string | null {
  const ink = result.regions.filter((r) => r.slot !== baseSlot).map((r) => r.shape);
  const { width, dark } = rasterize(ink, size, 6);
  const luminance = new Uint8ClampedArray(width * width);
  const rgba = new Uint8ClampedArray(width * width * 4);
  for (let i = 0; i < dark.length; i++) {
    const v = dark[i] ? 0 : 255;
    luminance[i] = v;
    rgba.set([v, v, v, 255], i * 4);
  }
  try {
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, width, width)));
    return new QRCodeReader().decode(bitmap, new Map([[DecodeHintType.TRY_HARDER, true]])).getText();
  } catch {
    return jsQR(rgba, width, width)?.data ?? null;
  }
}

export function testAssets(logo: LogoArt | null = null): BuildAssets {
  return { font: loadFont, logo };
}
