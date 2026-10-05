import { describe, expect, it } from 'vitest';
import { loadFont } from '../../test/helpers';
import { area, bounds, SCALE, type Shape } from '../geometry/shape';
import { BUNDLED_FONTS } from './fonts';
import { layoutArc, layoutLine } from './text';

describe('text', () => {
  for (const { id } of BUNDLED_FONTS) {
    it(`renders ${id} with capitals at the requested height`, () => {
      const font = loadFont(id)!;
      const line = layoutLine(font, 'HELLO', 8);
      expect(line.yMax).toBeCloseTo(8, 0);
      expect(line.width).toBeGreaterThan(10);
      expect(area(line.shape)).toBeGreaterThan(10);
      expect(line.missing).toEqual([]);
    });
  }

  it('reports characters the font cannot draw', () => {
    expect(layoutLine(loadFont('montserrat')!, 'Hi 漢', 5).missing).toEqual(['漢']);
  });

  it('bends top text outward and bottom text inward around the circle', () => {
    const font = loadFont('montserrat')!;
    const radii = (shape: Shape) => shape.flat().map((p) => Math.hypot(p.x, p.y) / SCALE);
    const top = layoutArc(font, 'TOP', 5, 40, 'top').shape;
    const bottom = layoutArc(font, 'BOTTOM', 5, 40, 'bottom').shape;
    // Capitals sit on the baseline circle and rise 5 mm away from it, outward on top and inward on the bottom.
    expect(Math.min(...radii(top))).toBeGreaterThan(39.9);
    expect(Math.max(...radii(top))).toBeLessThan(45.2);
    expect(Math.min(...radii(bottom))).toBeGreaterThan(34.9);
    expect(Math.max(...radii(bottom))).toBeLessThan(40.1);
    expect(bounds(top)!.minY).toBeGreaterThan(0);
    expect(bounds(bottom)!.maxY).toBeLessThan(0);
    const t = bounds(top)!;
    expect((t.minX + t.maxX) / 2).toBeCloseTo(0, 0);
  });
});
