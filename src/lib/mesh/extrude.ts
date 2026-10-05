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

    for (const triangle of cdt2d(points, edges, { exterior: false })) {
      const a = triangle[0];
      let [b, c] = [triangle[1], triangle[2]];
      const cross =
        (points[b][0] - points[a][0]) * (points[c][1] - points[a][1]) -
        (points[b][1] - points[a][1]) * (points[c][0] - points[a][0]);
      if (cross < 0) [b, c] = [c, b];
      triangles.push(base + count + a, base + count + b, base + count + c);
      triangles.push(base + a, base + c, base + b);
    }

    for (const [a, b] of edges) {
      triangles.push(base + a, base + b, base + b + count, base + a, base + b + count, base + a + count);
    }
  }

  return { positions, triangles };
}
