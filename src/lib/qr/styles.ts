import { circle, diamond, plus, rect, roundedRect, star, type CornerRadii } from '../geometry/primitives';
import { difference, union, type Shape } from '../geometry/shape';
import { finderOrigins, type QrMatrix } from './matrix';

export const MODULE_STYLES = [
  'square',
  'rounded',
  'liquid',
  'dots',
  'leaf',
  'horizontal',
  'vertical',
  'diamond',
] as const;
export type ModuleStyle = (typeof MODULE_STYLES)[number];

export const FRAME_STYLES = ['square', 'rounded', 'circle', 'leaf', 'point-in', 'point-out'] as const;
export type FrameStyle = (typeof FRAME_STYLES)[number];

export const CENTER_STYLES = [
  'square',
  'rounded',
  'circle',
  'leaf',
  'point-in',
  'diamond',
  'star',
  'burst',
  'plus',
] as const;
export type CenterStyle = (typeof CENTER_STYLES)[number];

/** Placement of the code in millimeters: the top-left corner of module (0, 0) and the module size, y up. */
export interface Grid {
  left: number;
  top: number;
  module: number;
}

function cellCenter(grid: Grid, row: number, col: number) {
  return { x: grid.left + (col + 0.5) * grid.module, y: grid.top - (row + 0.5) * grid.module };
}

/** Builds the data modules for which `include` is true, drawn in the given style. */
export function moduleShapes(
  size: number,
  include: (row: number, col: number) => boolean,
  style: ModuleStyle,
  grid: Grid,
): Shape {
  const m = grid.module;
  const on = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size && include(r, c);
  const parts: Shape[] = [];

  if (style === 'horizontal' || style === 'vertical') {
    const horizontal = style === 'horizontal';
    for (let line = 0; line < size; line++) {
      let runStart = -1;
      for (let i = 0; i <= size; i++) {
        const lit = i < size && (horizontal ? on(line, i) : on(i, line));
        if (lit && runStart < 0) runStart = i;
        if (!lit && runStart >= 0) {
          const length = (i - runStart) * m;
          const mid = (runStart + i - 1) / 2;
          const c = horizontal ? cellCenter(grid, line, mid) : cellCenter(grid, mid, line);
          const thick = 0.8 * m;
          const r = thick / 2;
          parts.push(
            horizontal
              ? roundedRect(c.x, c.y, length, thick, [r, r, r, r])
              : roundedRect(c.x, c.y, thick, length, [r, r, r, r]),
          );
          runStart = -1;
        }
      }
    }
    return union(parts);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const { x, y } = cellCenter(grid, r, c);
      if (!on(r, c)) {
        if (style === 'liquid') parts.push(...liquidFillets(on, r, c, x, y, m));
        continue;
      }
      switch (style) {
        case 'square':
          parts.push(rect(x, y, m, m));
          break;
        case 'dots':
          parts.push(circle(x, y, 0.42 * m));
          break;
        case 'diamond':
          parts.push(diamond(x, y, 0.56 * m));
          break;
        case 'rounded':
        case 'liquid':
        case 'leaf': {
          const R = 0.5 * m;
          const up = on(r - 1, c);
          const down = on(r + 1, c);
          const left = on(r, c - 1);
          const right = on(r, c + 1);
          const leaf = style === 'leaf';
          parts.push(
            roundedRect(x, y, m, m, [
              !up && !left ? R : 0,
              !leaf && !up && !right ? R : 0,
              !down && !right ? R : 0,
              !leaf && !down && !left ? R : 0,
            ]),
          );
          break;
        }
      }
    }
  }
  return union(parts);
}

/** Concave fillets that smooth the inside corner of an L formed by three lit modules around an unlit one. */
function liquidFillets(
  on: (r: number, c: number) => boolean,
  r: number,
  c: number,
  x: number,
  y: number,
  m: number,
): Shape[] {
  const f = 0.5 * m;
  const result: Shape[] = [];
  for (const [dr, dc] of [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ]) {
    if (!on(r + dr, c) || !on(r, c + dc) || !on(r + dr, c + dc)) continue;
    const px = x + (dc * m) / 2;
    const py = y - (dr * m) / 2;
    const qx = px - dc * f;
    const qy = py + dr * f;
    result.push(difference(rect((px + qx) / 2, (py + qy) / 2, f, f), circle(qx, qy, f)));
  }
  return result;
}

export type Corner = 'tl' | 'tr' | 'bl';
const CORNER_INDEX: Record<Corner, number> = { tl: 0, tr: 1, bl: 3 };

/** Corner radii for leaf and pointed shapes, oriented so each finder mirrors the others around the code. */
function orientedRadii(style: 'leaf' | 'point-in' | 'point-out', corner: Corner, radius: number): CornerRadii {
  const outer = CORNER_INDEX[corner];
  const inner = (outer + 2) % 4;
  const radii: CornerRadii = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    if (style === 'leaf') radii[i] = i === outer || i === inner ? radius : 0;
    else if (style === 'point-in') radii[i] = i === inner ? 0 : radius;
    else radii[i] = i === outer ? 0 : radius;
  }
  return radii;
}

export function frameShape(style: FrameStyle, corner: Corner, x: number, y: number, m: number): Shape {
  const outer = 7 * m;
  const inner = 5 * m;
  switch (style) {
    case 'square':
      return difference(rect(x, y, outer, outer), rect(x, y, inner, inner));
    case 'rounded':
      return difference(
        roundedRect(x, y, outer, outer, [2 * m, 2 * m, 2 * m, 2 * m]),
        roundedRect(x, y, inner, inner, [m, m, m, m]),
      );
    case 'circle':
      return difference(circle(x, y, outer / 2), circle(x, y, inner / 2));
    default:
      return difference(
        roundedRect(x, y, outer, outer, orientedRadii(style, corner, 3 * m)),
        roundedRect(x, y, inner, inner, orientedRadii(style, corner, 2 * m)),
      );
  }
}

export function centerShape(style: CenterStyle, corner: Corner, x: number, y: number, m: number): Shape {
  const s = 3 * m;
  switch (style) {
    case 'square':
      return rect(x, y, s, s);
    case 'rounded':
      return roundedRect(x, y, s, s, [0.9 * m, 0.9 * m, 0.9 * m, 0.9 * m]);
    case 'circle':
      return circle(x, y, s / 2);
    case 'leaf':
    case 'point-in':
      return roundedRect(x, y, s, s, orientedRadii(style, corner, 1.5 * m));
    case 'diamond':
      return diamond(x, y, 1.7 * m);
    case 'star':
      return star(x, y, 1.9 * m, 1.25 * m, 5);
    case 'burst':
      return star(x, y, 1.65 * m, 1.3 * m, 14);
    case 'plus':
      return plus(x, y, s, 1.2 * m);
  }
}

export function finderShapes(
  matrix: Pick<QrMatrix, 'size'>,
  frameStyle: FrameStyle,
  centerStyle: CenterStyle,
  grid: Grid,
) {
  const frames: Shape[] = [];
  const centers: Shape[] = [];
  for (const f of finderOrigins(matrix.size)) {
    const { x, y } = cellCenter(grid, f.row + 3, f.col + 3);
    frames.push(frameShape(frameStyle, f.corner, x, y, grid.module));
    centers.push(centerShape(centerStyle, f.corner, x, y, grid.module));
  }
  return { frames: union(frames), centers: union(centers) };
}
