import { describe, expect, it } from 'vitest';
import { circle, rect } from '../geometry/primitives';
import { difference, union } from '../geometry/shape';
import { extrude } from './extrude';
import { inspectMesh } from './validate';

describe('extrude', () => {
  it('produces a closed solid with the expected volume', () => {
    const report = inspectMesh(extrude(rect(0, 0, 10, 20), 0, 2));
    expect(report.badEdges).toBe(0);
    expect(report.volume).toBeCloseTo(400, 6);
  });

  it('handles holes and islands inside holes', () => {
    const ring = difference(rect(0, 0, 20, 20), rect(0, 0, 10, 10));
    const shape = union([ring, rect(0, 0, 4, 4)]);
    const report = inspectMesh(extrude(shape, 1, 3));
    expect(report.badEdges).toBe(0);
    expect(report.volume).toBeCloseTo((400 - 100 + 16) * 2, 6);
  });

  it('keeps caps watertight when separate holes share a straight line', () => {
    // Ear clipping runs an edge through the middle hole's corners here, leaving open edges.
    const holes = union([rect(-5, 0, 2, 2), rect(0, 0, 2, 2), rect(5, 0, 2, 2)]);
    const shape = difference(rect(0, 0, 20, 10), holes);
    expect(inspectMesh(extrude(shape, 0, 1)).badEdges).toBe(0);
  });

  it('approximates curves closely', () => {
    const report = inspectMesh(extrude(circle(0, 0, 50), 0, 1));
    expect(report.badEdges).toBe(0);
    expect(report.volume / (Math.PI * 2500)).toBeCloseTo(1, 3);
  });
});
