import { describe, expect, it } from 'vitest';
import { testAssets } from '../../test/helpers';
import { buildCoaster, type BuildResult } from '../coaster/build';
import { defaultSettings, type CoasterSettings } from '../coaster/settings';
import { circle, rect } from '../geometry/primitives';
import { area, difference, union } from '../geometry/shape';
import { simulatePrint } from './print';
import { scanCoaster } from './scan';

function build(change: (s: CoasterSettings) => void = () => {}) {
  const s = defaultSettings();
  change(s);
  return { s, result: buildCoaster(s, testAssets()) };
}

/** A hand-made top surface: ink on a 20 mm square base. */
function surface(ink: ReturnType<typeof rect>): BuildResult {
  const footprint = rect(0, 0, 20, 20);
  return {
    parts: [],
    regions: [
      { slot: 0, shape: difference(footprint, ink) },
      { slot: 1, shape: ink },
    ],
    size: 20,
    thickness: 2,
    footprint,
    baseSlot: 0,
    warnings: [],
    payload: '',
    qr: null,
  };
}

describe('simulatePrint', () => {
  it('drops ink lines thinner than the nozzle and keeps wider ones', () => {
    const thin = rect(-5, 0, 0.3, 10);
    const wide = rect(5, 0, 1, 10);
    const sim = simulatePrint(surface(union([thin, wide])), 0.4);
    expect(area(sim.lost)).toBeCloseTo(3, 1);
    expect(area(sim.regions[1].shape)).toBeCloseTo(10, 0);
  });

  it('fills base-color gaps thinner than the nozzle with the neighboring ink', () => {
    const ink = union([rect(-2.6, 0, 5, 5), rect(2.6, 0, 5, 5)]);
    const sim = simulatePrint(surface(ink), 0.4);
    // The 0.2 mm × 5 mm gap between the squares fills in.
    expect(area(sim.lost)).toBeCloseTo(1, 1);
    expect(area(union(sim.regions.slice(1).map((r) => r.shape)))).toBeCloseTo(51, 0);
  });

  it('ignores the slight rounding every printed corner gets', () => {
    const { result } = build();
    expect(simulatePrint(result, 0.4).lost).toEqual([]);
  });

  it('flags the gaps between dots on a dense code', () => {
    const { result } = build((s) => {
      s.content.type = 'text';
      s.content.text.text = 'A fairly long message that makes for a dense code on a small coaster';
      s.size = 70;
      s.moduleStyle = 'dots';
    });
    expect(area(simulatePrint(result, 0.4).lost)).toBeGreaterThan(1);
  });

  it('predicts a scannable print for the default coaster', () => {
    const { s, result } = build();
    const sim = simulatePrint(result, 0.4);
    expect(scanCoaster({ ...result, regions: sim.regions }, s.slots)).toBe(result.payload);
  });

  it('predicts an unreadable print when modules are thinner than the nozzle line', () => {
    const { s, result } = build((s) => {
      s.size = 40;
      s.margin = 2;
      s.content.type = 'text';
      s.content.text.text = 'A fairly long message that makes for a dense code on a tiny coaster';
    });
    expect(scanCoaster(result, s.slots)).toBe(result.payload);
    const sim = simulatePrint(result, 0.8);
    expect(scanCoaster({ ...result, regions: sim.regions }, s.slots)).toBeNull();
  });

  it('leaves shapes wider than the nozzle line intact', () => {
    const sim = simulatePrint(surface(circle(0, 0, 3)), 0.2);
    expect(sim.lost).toEqual([]);
  });
});
