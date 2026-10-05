import { CURVE_TOLERANCE, polygon, type Point, type Shape } from './shape';

/** Corner radii in the order top-left, top-right, bottom-right, bottom-left. */
export type CornerRadii = [number, number, number, number];

function arcSteps(radius: number, sweep: number): number {
  if (radius <= CURVE_TOLERANCE) return 1;
  const maxStep = 2 * Math.acos(1 - CURVE_TOLERANCE / radius);
  return Math.max(2, Math.ceil(Math.abs(sweep) / maxStep));
}

export function arcPoints(cx: number, cy: number, r: number, start: number, end: number): Point[] {
  const steps = arcSteps(r, end - start);
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = start + ((end - start) * i) / steps;
    points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return points;
}

export function circle(cx: number, cy: number, r: number): Shape {
  const points = arcPoints(cx, cy, r, 0, 2 * Math.PI);
  points.pop();
  return polygon(points);
}

export function rect(cx: number, cy: number, w: number, h: number): Shape {
  return roundedRect(cx, cy, w, h, [0, 0, 0, 0]);
}

/** A rectangle centered on (cx, cy) whose corners may each be rounded independently. */
export function roundedRect(cx: number, cy: number, w: number, h: number, radii: CornerRadii): Shape {
  const limit = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = radii.map((r) => Math.max(0, Math.min(r, limit)));
  const minX = cx - w / 2;
  const maxX = cx + w / 2;
  const minY = cy - h / 2;
  const maxY = cy + h / 2;
  const q = Math.PI / 2;
  const corner = (x: number, y: number, r: number, start: number): Point[] =>
    r > 0 ? arcPoints(x, y, r, start, start + q) : [{ x, y }];
  return polygon([
    ...corner(maxX - br, minY + br, br, -q),
    ...corner(maxX - tr, maxY - tr, tr, 0),
    ...corner(minX + tl, maxY - tl, tl, q),
    ...corner(minX + bl, minY + bl, bl, 2 * q),
  ]);
}

export function star(cx: number, cy: number, outer: number, inner: number, points: number, rotation = 0): Shape {
  const vertices: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + rotation + (Math.PI * i) / points;
    vertices.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return polygon(vertices);
}

export function diamond(cx: number, cy: number, halfDiagonal: number): Shape {
  return polygon([
    { x: cx + halfDiagonal, y: cy },
    { x: cx, y: cy + halfDiagonal },
    { x: cx - halfDiagonal, y: cy },
    { x: cx, y: cy - halfDiagonal },
  ]);
}

export function plus(cx: number, cy: number, size: number, arm: number): Shape {
  const s = size / 2;
  const a = arm / 2;
  return polygon([
    { x: cx + a, y: cy - s },
    { x: cx + a, y: cy - a },
    { x: cx + s, y: cy - a },
    { x: cx + s, y: cy + a },
    { x: cx + a, y: cy + a },
    { x: cx + a, y: cy + s },
    { x: cx - a, y: cy + s },
    { x: cx - a, y: cy + a },
    { x: cx - s, y: cy + a },
    { x: cx - s, y: cy - a },
    { x: cx - a, y: cy - a },
    { x: cx - a, y: cy - s },
  ]);
}
