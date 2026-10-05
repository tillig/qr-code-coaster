import { describe, expect, it } from 'vitest';
import { fitLayout, TEXT_GAP } from './layout';

const base = { codeModules: 25, blockModules: 29 };

describe('fitLayout', () => {
  it('fills a square with the code when there is no text', () => {
    const layout = fitLayout({ ...base, shape: 'square', half: 46 });
    expect(layout.blockSide).toBeCloseTo(92, 3);
  });

  it('inscribes the code in a circle when there is no text', () => {
    const layout = fitLayout({ ...base, shape: 'circle', half: 46 });
    expect(layout.blockSide).toBeCloseTo(46 * Math.SQRT2, 3);
    expect((layout.block.y0 + layout.block.y1) / 2).toBeCloseTo(0, 3);
  });

  it('stacks text above and below the code within the square', () => {
    const top = { width: 30, height: 6, align: 'center' as const };
    const layout = fitLayout({ ...base, shape: 'square', half: 46, top, bottom: top });
    expect(layout.blockSide).toBeCloseTo(92 - 2 * (6 + TEXT_GAP), 3);
    expect(layout.top!.y1).toBeCloseTo(46, 3);
    expect(layout.bottom!.y0).toBeCloseTo(-46, 3);
  });

  it('aligns text to the edges of the code', () => {
    const box = { width: 10, height: 5 };
    const layout = fitLayout({
      ...base,
      shape: 'square',
      half: 46,
      top: { ...box, align: 'left' },
      bottom: { ...box, align: 'right' },
    });
    const codeWidth = (layout.blockSide * base.codeModules) / base.blockModules;
    expect(layout.top!.x0).toBeCloseTo(-codeWidth / 2, 3);
    expect(layout.bottom!.x1).toBeCloseTo(codeWidth / 2, 3);
  });

  it('shifts the code away from text on one side of a circle', () => {
    // Wide enough that it cannot tuck into the space above a centered code.
    const layout = fitLayout({ ...base, shape: 'circle', half: 46, top: { width: 50, height: 8, align: 'center' } });
    expect((layout.block.y0 + layout.block.y1) / 2).toBeLessThan(0);
    for (const r of [layout.top!, layout.block]) {
      for (const x of [r.x0, r.x1])
        for (const y of [r.y0, r.y1]) expect(Math.hypot(x, y)).toBeLessThanOrEqual(46 + 1e-6);
    }
  });

  it('reports text that cannot fit', () => {
    const layout = fitLayout({ ...base, shape: 'square', half: 46, top: { width: 200, height: 6, align: 'center' } });
    expect(layout.fits).toBe(false);
  });
});
