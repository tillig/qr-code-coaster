import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype, { type Font } from 'opentype.js';
import type { BuildAssets } from '../lib/coaster/build';
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

export function testAssets(logo: LogoArt | null = null): BuildAssets {
  return { font: loadFont, logo };
}
