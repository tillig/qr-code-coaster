import type { Font, Glyph } from 'opentype.js';
import { flatten, transformCommands, type PathCommand } from '../geometry/path';
import { bounds, fill, union, type Point, type Shape } from '../geometry/shape';

const TEXT_TOLERANCE = 0.02;

interface PlacedGlyph {
  glyph: Glyph;
  x: number;
  advance: number;
}

/** A line of text with its baseline on y = 0, starting at x = 0. */
export interface TextLine {
  shape: Shape;
  width: number;
  yMin: number;
  yMax: number;
  missing: string[];
}

/** Font size (em height) in millimeters that gives capital letters the requested height. */
export function fontSizeForCapHeight(font: Font, capHeight: number): number {
  let capUnits = font.tables.os2?.sCapHeight as number | undefined;
  if (!capUnits) capUnits = font.charToGlyph('H').getBoundingBox().y2 || font.unitsPerEm * 0.7;
  return (capHeight * font.unitsPerEm) / capUnits;
}

function placeGlyphs(font: Font, text: string, fontSize: number): { glyphs: PlacedGlyph[]; width: number } {
  // Characters map straight to glyphs: the font parser's shaping step throws on lookup formats many fonts use.
  const scale = fontSize / font.unitsPerEm;
  const chars = Array.from(text).map((ch) => font.charToGlyph(ch));
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  chars.forEach((glyph, i) => {
    const advance = (glyph.advanceWidth ?? 0) * scale;
    glyphs.push({ glyph, x, advance });
    x += advance;
    if (i + 1 < chars.length) x += font.getKerningValue(glyph, chars[i + 1]) * scale;
  });
  const last = glyphs[glyphs.length - 1];
  return { glyphs, width: last ? last.x + last.advance : 0 };
}

/** Glyph outline commands with the y axis pointing up and the glyph origin at (0, 0). */
function glyphCommands(glyph: Glyph, fontSize: number): PathCommand[] {
  const commands = glyph.getPath(0, 0, fontSize).commands as PathCommand[];
  return transformCommands(commands, (p) => ({ x: p.x, y: -p.y }));
}

function outline(commands: PathCommand[]): Shape {
  return fill(flatten(commands, TEXT_TOLERANCE).map((l) => l.points));
}

function missingCharacters(font: Font, text: string): string[] {
  const missing = new Set<string>();
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    if (font.charToGlyph(ch).index === 0) missing.add(ch);
  }
  return [...missing];
}

export function layoutLine(font: Font, text: string, capHeight: number): TextLine {
  const fontSize = fontSizeForCapHeight(font, capHeight);
  const { glyphs, width } = placeGlyphs(font, text, fontSize);
  const shapes = glyphs.map(({ glyph, x }) =>
    outline(transformCommands(glyphCommands(glyph, fontSize), (p) => ({ x: p.x + x, y: p.y }))),
  );
  const shape = union(shapes);
  const box = bounds(shape);
  return {
    shape,
    width,
    yMin: Math.min(0, box?.minY ?? 0),
    yMax: Math.max(0, box?.maxY ?? 0),
    missing: missingCharacters(font, text),
  };
}

/**
 * Bends a line of text around the origin with its baseline on a circle of the given radius.
 * Text along the top reads clockwise with letters pointing outward; along the bottom it reads
 * counterclockwise with letters pointing inward, so both stay upright.
 */
export function layoutArc(
  font: Font,
  text: string,
  capHeight: number,
  baselineRadius: number,
  position: 'top' | 'bottom',
): { shape: Shape; arcLength: number } {
  const fontSize = fontSizeForCapHeight(font, capHeight);
  const { glyphs, width } = placeGlyphs(font, text, fontSize);
  const shapes = glyphs.map(({ glyph, x, advance }) => {
    const angle = (x + advance / 2 - width / 2) / baselineRadius;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const toArc = (p: Point): Point => {
      const dx = p.x - advance / 2;
      return position === 'top'
        ? { x: dx * cos + p.y * sin + baselineRadius * sin, y: -dx * sin + p.y * cos + baselineRadius * cos }
        : { x: dx * cos - p.y * sin + baselineRadius * sin, y: dx * sin + p.y * cos - baselineRadius * cos };
    };
    return outline(transformCommands(glyphCommands(glyph, fontSize), toArc));
  });
  return { shape: union(shapes), arcLength: width };
}
