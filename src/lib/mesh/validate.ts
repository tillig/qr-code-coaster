import type { Mesh } from './extrude';

export interface MeshReport {
  triangles: number;
  /** Edges not shared by exactly one opposite-facing triangle; zero for a watertight, consistently wound solid. */
  badEdges: number;
  degenerateTriangles: number;
  volume: number;
}

/** Checks a mesh the way a slicer will see it, merging vertices by position rather than by index. */
export function inspectMesh(mesh: Mesh): MeshReport {
  const p = mesh.positions;
  const t = mesh.triangles;
  const key = (i: number) => `${p[3 * i].toFixed(4)},${p[3 * i + 1].toFixed(4)},${p[3 * i + 2].toFixed(4)}`;
  const edges = new Map<string, number>();
  let degenerate = 0;
  let volume = 0;

  for (let i = 0; i < t.length; i += 3) {
    const ids = [key(t[i]), key(t[i + 1]), key(t[i + 2])];
    const [a, b, c] = [t[i], t[i + 1], t[i + 2]].map((v) => [p[3 * v], p[3 * v + 1], p[3 * v + 2]]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (Math.hypot(...cross) < 1e-9) degenerate++;
    volume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    for (let k = 0; k < 3; k++) {
      const from = ids[k];
      const to = ids[(k + 1) % 3];
      edges.set(`${from}>${to}`, (edges.get(`${from}>${to}`) ?? 0) + 1);
    }
  }

  let badEdges = 0;
  for (const [edge, count] of edges) {
    const [from, to] = edge.split('>');
    if (count !== 1 || edges.get(`${to}>${from}`) !== 1) badEdges++;
  }
  return { triangles: t.length / 3, badEdges, degenerateTriangles: degenerate, volume };
}
