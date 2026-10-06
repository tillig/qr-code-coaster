import { describe, expect, it } from 'vitest';
import { loft } from '../mesh/extrude';
import { inspectMesh } from '../mesh/validate';
import { edgeProfile, outlineRing, profileBetween, type Outline } from './outline';

const outlines: Outline[] = [
  { shape: 'circle', size: 100, cornerRadius: 0 },
  { shape: 'square', size: 100, cornerRadius: 6 },
  { shape: 'square', size: 100, cornerRadius: 0 },
];

describe('outlineRing', () => {
  for (const o of outlines) {
    it(`keeps the same point count at every inset for a ${o.shape} with corner radius ${o.cornerRadius}`, () => {
      expect(outlineRing(o, 0.8).length).toBe(outlineRing(o, 0).length);
    });
  }

  it('shrinks by exactly the inset', () => {
    const ring = outlineRing({ shape: 'square', size: 100, cornerRadius: 6 }, 1);
    expect(Math.max(...ring.map((p) => p.x))).toBeCloseTo(49, 9);
  });
});

describe('edgeProfile', () => {
  it('bevels the bottom at 45 degrees and rounds the top', () => {
    const profile = edgeProfile(2.5, 0.8);
    expect(profile[0]).toEqual({ z: 0, inset: 0.4 });
    expect(profile[1]).toEqual({ z: 0.4, inset: 0 });
    expect(profile.at(-1)!.z).toBeCloseTo(2.5, 9);
    expect(profile.at(-1)!.inset).toBeCloseTo(0.8, 9);
    for (let i = 1; i < profile.length; i++) expect(profile[i].z).toBeGreaterThan(profile[i - 1].z);
  });

  it('splits at a height inside the rounding, matching on both sides', () => {
    const profile = edgeProfile(2.5, 1);
    const below = profileBetween(profile, 0, 1.9);
    const above = profileBetween(profile, 1.9, 2.5);
    expect(below.at(-1)).toEqual(above[0]);
    expect(above[0].inset).toBeGreaterThan(0);
  });
});

describe('loft', () => {
  for (const o of outlines) {
    it(`builds a watertight ${o.shape} with beveled and rounded edges and a hole`, () => {
      const levels = edgeProfile(2.5, 0.8).map((l) => ({ z: l.z, ring: outlineRing(o, l.inset) }));
      const hole = outlineRing({ shape: 'circle', size: 10, cornerRadius: 0 }, 0);
      const report = inspectMesh(loft(levels, [hole]));
      expect(report.badEdges).toBe(0);
      expect(report.degenerateTriangles).toBe(0);
      expect(report.volume).toBeGreaterThan(0);
    });
  }
});
