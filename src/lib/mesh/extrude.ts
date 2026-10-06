import cdt2d from 'cdt2d';
import { polygonsWithHoles, type Point, type Shape } from '../geometry/shape';

/** An indexed triangle mesh in millimeters. Triangles wind counterclockwise when viewed from outside. */
export interface Mesh {
  positions: number[];
  triangles: number[];
}

function signedArea(ring: Point[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j].x - ring[i].x) * (ring[j].y + ring[i].y);
  }
  return sum / 2;
}

function oriented(ring: Point[], counterclockwise: boolean): Point[] {
  return signedArea(ring) > 0 === counterclockwise ? ring : [...ring].reverse();
}

/**
 * Turns a planar region into a closed solid spanning z0 to z1.
 *
 * Caps use a constrained Delaunay triangulation because it keeps every boundary point as a vertex.
 * Ear clipping can run an edge straight through a collinear point on another ring, which slicers
 * report as an open edge.
 */
export function extrude(shape: Shape, z0: number, z1: number): Mesh {
  const positions: number[] = [];
  const triangles: number[] = [];

  for (const polygon of polygonsWithHoles(shape)) {
    const rings = [oriented(polygon.outer, true), ...polygon.holes.map((h) => oriented(h, false))];
    const base = positions.length / 3;
    const points: [number, number][] = [];
    const lookup = new Map<string, number>();
    const index = (p: Point) => {
      const key = `${p.x},${p.y}`;
      let i = lookup.get(key);
      if (i === undefined) {
        i = points.length;
        lookup.set(key, i);
        points.push([p.x, p.y]);
      }
      return i;
    };
    const ringIndices = rings.map((ring) => ring.map(index));
    const edges: [number, number][] = [];
    for (const ids of ringIndices) {
      for (let k = 0; k < ids.length; k++) edges.push([ids[k], ids[(k + 1) % ids.length]]);
    }

    const count = points.length;
    for (const [x, y] of points) positions.push(x, y, z0);
    for (const [x, y] of points) positions.push(x, y, z1);

    for (const [a, b, c] of capTriangles(points, edges)) {
      triangles.push(base + count + a, base + count + b, base + count + c);
      triangles.push(base + a, base + c, base + b);
    }

    for (const [a, b] of edges) {
      triangles.push(base + a, base + b, base + b + count, base + a, base + b + count, base + a + count);
    }
  }

  return { positions, triangles };
}

/** Triangulates a cap bounded by the given edges, wound counterclockwise seen from above. */
function capTriangles(points: [number, number][], edges: [number, number][]): [number, number, number][] {
  return cdt2d(points, edges, { exterior: false }).map(([a, b, c]) => {
    const cross =
      (points[b][0] - points[a][0]) * (points[c][1] - points[a][1]) -
      (points[b][1] - points[a][1]) * (points[c][0] - points[a][0]);
    return cross < 0 ? [a, c, b] : [a, b, c];
  });
}

/**
 * Joins outlines at increasing heights into a closed solid whose side follows them, such as a beveled or
 * rounded edge. Every outline must have the same number of points in matching order; holes run straight
 * through from the lowest to the highest level.
 */
export function loft(levels: { z: number; ring: Point[] }[], holes: Point[][]): Mesh {
  const positions: number[] = [];
  const triangles: number[] = [];
  const rings = levels.map((l) => oriented(l.ring, true));
  const holeRings = holes.map((h) => oriented(h, false));
  const n = rings[0].length;
  const bottom = levels[0].z;
  const top = levels[levels.length - 1].z;

  rings.forEach((ring, i) => {
    for (const p of ring) positions.push(p.x, p.y, levels[i].z);
  });
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let k = 0; k < n; k++) {
      const a = i * n + k;
      const b = i * n + ((k + 1) % n);
      triangles.push(a, b, b + n, a, b + n, a + n);
    }
  }

  const holeCount = holeRings.reduce((sum, h) => sum + h.length, 0);
  const holeBase = positions.length / 3;
  for (const z of [bottom, top]) for (const h of holeRings) for (const p of h) positions.push(p.x, p.y, z);
  let start = 0;
  const holeEdges: [number, number][] = [];
  for (const h of holeRings) {
    for (let k = 0; k < h.length; k++) {
      const a = holeBase + start + k;
      const b = holeBase + start + ((k + 1) % h.length);
      triangles.push(a, b, b + holeCount, a, b + holeCount, a + holeCount);
      holeEdges.push([n + start + k, n + start + ((k + 1) % h.length)]);
    }
    start += h.length;
  }

  // Caps index the outline points first, then the hole points.
  const ringEdges: [number, number][] = Array.from({ length: n }, (_, k) => [k, (k + 1) % n]);
  const capIndex = (level: number, holeOffset: number) => (i: number) =>
    i < n ? level * n + i : holeBase + holeOffset + (i - n);
  const flatHoles = holeRings.flat().map((p): [number, number] => [p.x, p.y]);
  const capOf = (ring: Point[]) =>
    capTriangles([...ring.map((p): [number, number] => [p.x, p.y]), ...flatHoles], [...ringEdges, ...holeEdges]);
  const lower = capIndex(0, 0);
  for (const [a, b, c] of capOf(rings[0])) triangles.push(lower(a), lower(c), lower(b));
  const upper = capIndex(rings.length - 1, holeCount);
  for (const [a, b, c] of capOf(rings[rings.length - 1])) triangles.push(upper(a), upper(b), upper(c));

  return { positions, triangles };
}
