import svgpath from 'svgpath';
import { flatten, transformCommands, type PathCommand, type Polyline } from '../geometry/path';
import {
  bounds,
  difference,
  EndType,
  fill,
  FillRule,
  JoinType,
  stroke,
  translate,
  union,
  type Shape,
} from '../geometry/shape';

/** Size of the box logo artwork is normalized into: the longer side is this many units. */
export const ART_SIZE = 100;
const ART_TOLERANCE = 0.05;

/** Solid-color vector artwork with y up, origin at the bottom-left, and no overlap between colors. */
export interface LogoArt {
  width: number;
  height: number;
  layers: { color: string; shape: Shape }[];
}

/** One painted item in source order: a filled path or a stroked path, in source coordinates with y down. */
export interface PaintItem {
  color: string;
  commands: PathCommand[];
  fillRule?: FillRule;
  stroke?: { width: number; join: JoinType; cap: EndType };
}

export function svgPathToCommands(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  svgpath(d)
    .abs()
    .unarc()
    .unshort()
    .iterate((seg, _i, x, y) => {
      switch (seg[0]) {
        case 'M':
          commands.push({ type: 'M', x: seg[1], y: seg[2] });
          break;
        case 'L':
          commands.push({ type: 'L', x: seg[1], y: seg[2] });
          break;
        case 'H':
          commands.push({ type: 'L', x: seg[1], y });
          break;
        case 'V':
          commands.push({ type: 'L', x, y: seg[1] });
          break;
        case 'C':
          commands.push({ type: 'C', x1: seg[1], y1: seg[2], x2: seg[3], y2: seg[4], x: seg[5], y: seg[6] });
          break;
        case 'Q':
          commands.push({ type: 'Q', x1: seg[1], y1: seg[2], x: seg[3], y: seg[4] });
          break;
        case 'Z':
        case 'z':
          commands.push({ type: 'Z' });
          break;
      }
    });
  return commands;
}

function commandBounds(items: PaintItem[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    const pad = item.stroke ? item.stroke.width / 2 : 0;
    for (const cmd of item.commands) {
      if (cmd.type === 'Z') continue;
      const xs = [cmd.x];
      const ys = [cmd.y];
      if (cmd.type === 'Q' || cmd.type === 'C') {
        xs.push(cmd.x1);
        ys.push(cmd.y1);
      }
      if (cmd.type === 'C') {
        xs.push(cmd.x2);
        ys.push(cmd.y2);
      }
      minX = Math.min(minX, ...xs.map((v) => v - pad));
      maxX = Math.max(maxX, ...xs.map((v) => v + pad));
      minY = Math.min(minY, ...ys.map((v) => v - pad));
      maxY = Math.max(maxY, ...ys.map((v) => v + pad));
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

function paint(item: PaintItem, lines: Polyline[], scale: number): Shape {
  if (!item.stroke)
    return fill(
      lines.map((l) => l.points),
      item.fillRule ?? FillRule.NonZero,
    );
  const width = item.stroke.width * scale;
  const closed = lines.filter((l) => l.closed).map((l) => l.points);
  const open = lines.filter((l) => !l.closed).map((l) => l.points);
  return union([
    stroke(closed, width, true, item.stroke.join),
    stroke(open, width, false, item.stroke.join, item.stroke.cap),
  ]);
}

/** Normalizes painted items into a LogoArt, letting later items hide earlier ones as SVG does. */
export function artFromItems(items: PaintItem[]): LogoArt | null {
  const box = commandBounds(items);
  if (!box) return null;
  const scale = ART_SIZE / Math.max(box.maxX - box.minX, box.maxY - box.minY, 1e-9);
  const painted = items.map((item) => {
    const commands = transformCommands(item.commands, (p) => ({
      x: (p.x - box.minX) * scale,
      y: (box.maxY - p.y) * scale,
    }));
    return { color: item.color.toLowerCase(), shape: paint(item, flatten(commands, ART_TOLERANCE), scale) };
  });

  const visible = new Map<string, Shape[]>();
  let covered: Shape = [];
  for (let i = painted.length - 1; i >= 0; i--) {
    const { color, shape } = painted[i];
    const shown = difference(shape, covered);
    if (shown.length) visible.set(color, [...(visible.get(color) ?? []), shown]);
    covered = union([covered, shape]);
  }

  const all = bounds(covered);
  if (!all) return null;
  const layers = [...visible.entries()]
    .reverse()
    .map(([color, shapes]) => ({ color, shape: translate(union(shapes), -all.minX, -all.minY) }));
  return { width: all.maxX - all.minX, height: all.maxY - all.minY, layers };
}
