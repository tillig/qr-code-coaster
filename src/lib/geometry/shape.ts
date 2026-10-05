import {
  Clipper,
  ClipType,
  EndType,
  FillRule,
  JoinType,
  PolyTree64,
  type Path64,
  type Paths64,
  type PolyPath64,
} from '@countertype/clipper2-ts';

export { FillRule, JoinType, EndType };

/** Integer units per millimeter for all polygon math, giving 1 µm resolution. */
export const SCALE = 1000;

/** Maximum distance in millimeters between a true curve and its polygon approximation. */
export const CURVE_TOLERANCE = 0.01;

export interface Point {
  x: number;
  y: number;
}

/** A planar region made of closed integer paths, interpreted with the nonzero fill rule. */
export type Shape = Paths64;

export interface PolygonWithHoles {
  outer: Point[];
  holes: Point[][];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function toPath(points: Point[]): Path64 {
  return points.map((p) => ({ x: Math.round(p.x * SCALE), y: Math.round(p.y * SCALE) }));
}

export function polygon(points: Point[]): Shape {
  return [toPath(points)];
}

/** Normalizes arbitrary, possibly self-intersecting contours into a clean region. */
export function fill(contours: Point[][], fillRule: FillRule = FillRule.NonZero): Shape {
  const paths = contours.filter((c) => c.length >= 3).map(toPath);
  return paths.length ? Clipper.union(paths, fillRule) : [];
}

export function union(shapes: Shape[]): Shape {
  const paths = shapes.flat();
  return paths.length ? Clipper.union(paths, FillRule.NonZero) : [];
}

export function difference(subject: Shape, clip: Shape): Shape {
  if (!subject.length) return [];
  if (!clip.length) return subject;
  return Clipper.difference(subject, clip, FillRule.NonZero);
}

export function intersect(subject: Shape, clip: Shape): Shape {
  if (!subject.length || !clip.length) return [];
  return Clipper.intersect(subject, clip, FillRule.NonZero);
}

/** Grows (positive) or shrinks (negative) a region by a distance in millimeters. */
export function offset(shape: Shape, distance: number, join: JoinType = JoinType.Miter): Shape {
  if (!shape.length || distance === 0) return shape;
  return Clipper.inflatePaths(shape, distance * SCALE, join, EndType.Polygon, 2, CURVE_TOLERANCE * SCALE);
}

/** Converts polylines into the filled outline of a stroke of the given width. */
export function stroke(
  lines: Point[][],
  width: number,
  closed: boolean,
  join: JoinType = JoinType.Round,
  cap: EndType = EndType.Round,
): Shape {
  const paths = lines.filter((l) => l.length >= 2).map(toPath);
  if (!paths.length || width <= 0) return [];
  const raw = Clipper.inflatePaths(
    paths,
    (width / 2) * SCALE,
    join,
    closed ? EndType.Joined : cap,
    4,
    CURVE_TOLERANCE * SCALE,
  );
  return Clipper.union(raw, FillRule.NonZero);
}

export function mapPoints(shape: Shape, fn: (p: Point) => Point): Shape {
  return shape.map((path) =>
    path.map((pt) => {
      const q = fn({ x: pt.x / SCALE, y: pt.y / SCALE });
      return { x: Math.round(q.x * SCALE), y: Math.round(q.y * SCALE) };
    }),
  );
}

export function translate(shape: Shape, dx: number, dy: number): Shape {
  const ix = Math.round(dx * SCALE);
  const iy = Math.round(dy * SCALE);
  return shape.map((path) => path.map((pt) => ({ x: pt.x + ix, y: pt.y + iy })));
}

/** Area in square millimeters. */
export function area(shape: Shape): number {
  return Clipper.areaPaths(shape) / (SCALE * SCALE);
}

export function bounds(shape: Shape): Bounds | null {
  if (!shape.length) return null;
  const r = Clipper.getBoundsPaths(shape);
  return { minX: r.left / SCALE, minY: r.top / SCALE, maxX: r.right / SCALE, maxY: r.bottom / SCALE };
}

/** Removes slivers too small to print and redundant vertices, leaving a normalized region. */
export function clean(shape: Shape, minArea = 0.02): Shape {
  if (!shape.length) return shape;
  const tree = new PolyTree64();
  Clipper.booleanOpWithPolyTree(ClipType.Union, shape, null, tree, FillRule.NonZero);
  const kept: Paths64 = [];
  const minIntArea = minArea * SCALE * SCALE;
  const visit = (node: PolyPath64) => {
    for (let i = 0; i < node.count; i++) {
      const child = node.child(i);
      const poly = child.polygon;
      // Dropping an outline also drops everything nested in it.
      if (!poly || Math.abs(Clipper.area(poly)) < minIntArea) continue;
      kept.push(poly);
      visit(child);
    }
  };
  visit(tree);
  const simplified = Clipper.simplifyPaths(kept, 2, true).filter((p) => p.length >= 3);
  return simplified.length ? Clipper.union(simplified, FillRule.NonZero) : [];
}

/** Splits a region into outlines with their holes, ready for triangulation. */
export function polygonsWithHoles(shape: Shape): PolygonWithHoles[] {
  if (!shape.length) return [];
  const tree = new PolyTree64();
  Clipper.booleanOpWithPolyTree(ClipType.Union, shape, null, tree, FillRule.NonZero);
  const result: PolygonWithHoles[] = [];
  const toPoints = (path: Path64) => path.map((pt) => ({ x: pt.x / SCALE, y: pt.y / SCALE }));
  const visitOuter = (node: PolyPath64) => {
    for (let i = 0; i < node.count; i++) {
      const outer = node.child(i);
      if (!outer.polygon) continue;
      const holes: Point[][] = [];
      for (let j = 0; j < outer.count; j++) {
        const hole = outer.child(j);
        if (hole.polygon) holes.push(toPoints(hole.polygon));
        // Islands inside a hole are outlines in their own right.
        visitOuter(hole);
      }
      result.push({ outer: toPoints(outer.polygon), holes });
    }
  };
  visitOuter(tree);
  return result;
}

/** Renders a region as SVG path data with the y axis flipped, for thumbnails and 2D previews. */
export function toSvgPath(shape: Shape): string {
  return shape.map((path) => 'M' + path.map((pt) => `${pt.x / SCALE} ${-pt.y / SCALE}`).join('L') + 'Z').join('');
}
