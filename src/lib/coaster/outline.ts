import { arcSteps } from '../geometry/primitives';
import type { Point } from '../geometry/shape';

export interface Outline {
  shape: 'circle' | 'square';
  size: number;
  /** Corner radius of a square coaster; 0 for sharp corners. Must be at least the largest inset used. */
  cornerRadius: number;
}

/**
 * The coaster's edge shrunk inward by `inset`, counterclockwise. Every inset yields the same number of
 * points in the same order, so outlines at different heights join directly into a sloped or rounded wall.
 */
export function outlineRing(outline: Outline, inset: number): Point[] {
  const half = outline.size / 2;
  if (outline.shape === 'circle') {
    const n = arcSteps(half, 2 * Math.PI);
    const r = half - inset;
    return Array.from({ length: n }, (_, i) => ({
      x: r * Math.cos((2 * Math.PI * i) / n),
      y: r * Math.sin((2 * Math.PI * i) / n),
    }));
  }
  const h = half - inset;
  const R = outline.cornerRadius;
  if (R <= 0) {
    return [
      { x: h, y: -h },
      { x: h, y: h },
      { x: -h, y: h },
      { x: -h, y: -h },
    ];
  }
  const r = R - inset;
  const steps = arcSteps(R, Math.PI / 2);
  const corners = [
    { cx: h - r, cy: -(h - r), start: -Math.PI / 2 },
    { cx: h - r, cy: h - r, start: 0 },
    { cx: -(h - r), cy: h - r, start: Math.PI / 2 },
    { cx: -(h - r), cy: -(h - r), start: Math.PI },
  ];
  return corners.flatMap(({ cx, cy, start }) =>
    Array.from({ length: steps + 1 }, (_, j) => {
      const a = start + (Math.PI / 2) * (j / steps);
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }),
  );
}

export interface ProfileLevel {
  z: number;
  inset: number;
}

/**
 * How far the side of the coaster steps inward at each height: a 45° bevel half the edge size at the bottom,
 * which prints without supports, and a quarter-round of the edge size at the top.
 */
export function edgeProfile(thickness: number, edge: number): ProfileLevel[] {
  if (edge <= 0) {
    return [
      { z: 0, inset: 0 },
      { z: thickness, inset: 0 },
    ];
  }
  const bevel = edge / 2;
  const levels: ProfileLevel[] = [
    { z: 0, inset: bevel },
    { z: bevel, inset: 0 },
  ];
  const steps = Math.min(16, Math.max(4, Math.ceil(edge / 0.1)));
  for (let i = 0; i <= steps; i++) {
    const t = ((Math.PI / 2) * i) / steps;
    levels.push({ z: thickness - edge + edge * Math.sin(t), inset: edge * (1 - Math.cos(t)) });
  }
  // A zero-height step would make degenerate walls.
  return levels.filter((l, i) => i === 0 || l.z > levels[i - 1].z + 1e-9);
}

/** The profile between two heights, including both ends. */
export function profileBetween(profile: ProfileLevel[], z0: number, z1: number): ProfileLevel[] {
  const at = (z: number): ProfileLevel => {
    for (let i = 1; i < profile.length; i++) {
      const a = profile[i - 1];
      const b = profile[i];
      if (z <= b.z) {
        const t = b.z === a.z ? 0 : (z - a.z) / (b.z - a.z);
        return { z, inset: a.inset + (b.inset - a.inset) * t };
      }
    }
    return { z, inset: profile[profile.length - 1].inset };
  };
  const inner = profile.filter((l) => l.z > z0 + 1e-9 && l.z < z1 - 1e-9);
  return [at(z0), ...inner, at(z1)];
}
