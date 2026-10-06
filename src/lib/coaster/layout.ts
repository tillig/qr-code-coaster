import type { Alignment } from './settings';

/** Space between a straight line of text and the code's quiet zone, in millimeters. */
export const TEXT_GAP = 1;

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TextBox {
  width: number;
  height: number;
  align: Alignment;
}

export interface LayoutInput {
  shape: 'circle' | 'square';
  /** Half the usable width: the coaster radius or half-side, minus the margin. */
  half: number;
  /** Corner radius of a square usable area. */
  cornerRadius?: number;
  /** Modules across the code itself, without the quiet zone. */
  codeModules: number;
  /** Modules across the code including the quiet zone on both sides. */
  blockModules: number;
  top?: TextBox;
  bottom?: TextBox;
}

export interface Layout {
  /** Side of the code block, including its quiet zone. */
  blockSide: number;
  block: Rect;
  top?: Rect;
  bottom?: Rect;
  /** False when even the smallest code cannot fit next to the text. */
  fits: boolean;
}

function arrange(input: LayoutInput, side: number, shift: number): Omit<Layout, 'fits'> {
  const { top, bottom } = input;
  const total = (top ? top.height + TEXT_GAP : 0) + side + (bottom ? bottom.height + TEXT_GAP : 0);
  const codeWidth = (side * input.codeModules) / input.blockModules;
  const textRect = (box: TextBox, y1: number): Rect => {
    const x0 =
      box.align === 'left' ? -codeWidth / 2 : box.align === 'right' ? codeWidth / 2 - box.width : -box.width / 2;
    return { x0, x1: x0 + box.width, y0: y1 - box.height, y1 };
  };
  let y = shift + total / 2;
  const result: Omit<Layout, 'fits'> = { blockSide: side, block: { x0: 0, x1: 0, y0: 0, y1: 0 } };
  if (top) {
    result.top = textRect(top, y);
    y -= top.height + TEXT_GAP;
  }
  result.block = { x0: -side / 2, x1: side / 2, y0: y - side, y1: y };
  y -= side + TEXT_GAP;
  if (bottom) result.bottom = textRect(bottom, y);
  return result;
}

/** Signed distance from a point to the edge of a square usable area with rounded corners; negative inside. */
function roundedSquareDistance(x: number, y: number, input: LayoutInput): number {
  const r = Math.min(input.cornerRadius ?? 0, input.half);
  const qx = Math.abs(x) - (input.half - r);
  const qy = Math.abs(y) - (input.half - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** How far the furthest corner sticks out past the usable area; zero or less means everything fits. */
function overflow(input: LayoutInput, layout: Omit<Layout, 'fits'>): number {
  let worst = -Infinity;
  for (const r of [layout.top, layout.block, layout.bottom]) {
    if (!r) continue;
    for (const x of [r.x0, r.x1]) {
      for (const y of [r.y0, r.y1]) {
        const out = input.shape === 'circle' ? Math.hypot(x, y) - input.half : roundedSquareDistance(x, y, input);
        worst = Math.max(worst, out);
      }
    }
  }
  return worst;
}

function bestShift(input: LayoutInput, side: number): { shift: number; overflow: number } {
  // Overflow is convex in the vertical shift, so a ternary search finds the best position.
  let lo = -input.half;
  let hi = input.half;
  for (let i = 0; i < 60; i++) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (overflow(input, arrange(input, side, a)) <= overflow(input, arrange(input, side, b))) hi = b;
    else lo = a;
  }
  const shift = (lo + hi) / 2;
  return { shift, overflow: overflow(input, arrange(input, side, shift)) };
}

/** Finds the largest code that fits alongside the text inside the usable area. */
export function fitLayout(input: LayoutInput): Layout {
  let lo = 0;
  let hi = 2 * input.half;
  let shift = 0;
  const smallest = bestShift(input, 1e-3);
  if (smallest.overflow > 1e-6) return { ...arrange(input, 0, smallest.shift), fits: false };
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const attempt = bestShift(input, mid);
    if (attempt.overflow <= 1e-6) {
      lo = mid;
      shift = attempt.shift;
    } else {
      hi = mid;
    }
  }
  return { ...arrange(input, lo, shift), fits: true };
}
