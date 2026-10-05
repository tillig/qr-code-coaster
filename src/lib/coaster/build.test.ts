import { describe, expect, it } from 'vitest';
import { area } from '../geometry/shape';
import { iconArt, findIcon } from '../logo/icons';
import { inspectMesh } from '../mesh/validate';
import { CENTER_STYLES, FRAME_STYLES, MODULE_STYLES } from '../qr/styles';
import { scanCoaster } from '../scan/scan';
import { testAssets } from '../../test/helpers';
import { buildCoaster } from './build';
import { defaultSettings, type CoasterSettings } from './settings';

function settings(change: (s: CoasterSettings) => void = () => {}): CoasterSettings {
  const s = defaultSettings();
  s.content.link.url = 'https://example.com/coaster';
  change(s);
  return s;
}

function expectSolid(result: ReturnType<typeof buildCoaster>) {
  for (const part of result.parts) {
    const report = inspectMesh(part.mesh);
    expect(report.badEdges, `${part.name} has open or non-manifold edges`).toBe(0);
    expect(report.volume, `${part.name} volume`).toBeGreaterThan(0);
  }
}

describe('buildCoaster', () => {
  it('builds a scannable, watertight default coaster', () => {
    const s = settings();
    const result = buildCoaster(s, testAssets());
    expect(result.warnings).toEqual([]);
    expectSolid(result);
    expect(scanCoaster(result, s.slots)).toBe('https://example.com/coaster');
  });

  it('splits the top surface into regions that exactly cover the coaster', () => {
    const s = settings((s) => (s.shape = 'square'));
    const result = buildCoaster(s, testAssets());
    const total = result.regions.reduce((sum, r) => sum + area(r.shape), 0);
    expect(total).toBeCloseTo(s.size * s.size, 0);
  });

  it('never uses more than four filament slots', () => {
    const s = settings((s) => {
      s.slots = ['#ffffff', '#000000', '#ff0000', '#0000ff', '#00ff00'];
      s.frameSlot = 2;
      s.centerSlot = 3;
      s.moduleSlot = 4;
    });
    const result = buildCoaster(s, testAssets());
    expect(new Set(result.parts.map((p) => p.slot)).size).toBeLessThanOrEqual(4);
    expect(Math.max(...result.parts.map((p) => p.slot))).toBeLessThan(4);
  });

  it('keeps the base, inlay, and total thickness consistent', () => {
    const s = settings((s) => {
      s.thickness = 3;
      s.inlayDepth = 0.8;
    });
    const result = buildCoaster(s, testAssets());
    const zs = result.parts.flatMap((p) => p.mesh.positions.filter((_, i) => i % 3 === 2));
    expect(Math.min(...zs)).toBe(0);
    expect(Math.max(...zs)).toBe(3);
    expect(new Set(zs)).toEqual(new Set([0, 2.2, 3]));
  });

  for (const moduleStyle of MODULE_STYLES) {
    it(`renders a scannable code with ${moduleStyle} modules`, () => {
      const s = settings((s) => (s.moduleStyle = moduleStyle));
      const result = buildCoaster(s, testAssets());
      expectSolid(result);
      expect(scanCoaster(result, s.slots)).toBe('https://example.com/coaster');
    });
  }

  for (const frameStyle of FRAME_STYLES) {
    for (const centerStyle of CENTER_STYLES) {
      it(`renders a scannable code with ${frameStyle} finder frames and ${centerStyle} centers`, () => {
        const s = settings((s) => {
          s.frameStyle = frameStyle;
          s.centerStyle = centerStyle;
          s.frameSlot = 2;
          s.slots = ['#ffffff', '#000000', '#202060'];
        });
        const result = buildCoaster(s, testAssets());
        expectSolid(result);
        expect(scanCoaster(result, s.slots)).toBe('https://example.com/coaster');
      });
    }
  }

  it('renders a scannable code with a logo on a badge and curved text', () => {
    const s = settings((s) => {
      s.slots = ['#ffffff', '#000000', '#1e60c8'];
      s.logo = { ...s.logo, source: 'icon', iconId: 'wifi', badge: 'circle', badgeSlot: 2, iconSlot: 0 };
      s.topText = { ...s.topText, text: 'Guest Wi-Fi', curved: true };
      s.bottomText = { ...s.bottomText, text: 'Scan to join', curved: true, slot: 2 };
    });
    const result = buildCoaster(s, testAssets(iconArt(findIcon('wifi')!)));
    expect(result.warnings).toEqual([]);
    expect(result.qr?.errorCorrection).toBe('H');
    expectSolid(result);
    expect(scanCoaster(result, s.slots)).toBe('https://example.com/coaster');
  });

  it('shrinks the code to make room for straight text on a square coaster', () => {
    const plain = buildCoaster(
      settings((s) => (s.shape = 'square')),
      testAssets(),
    );
    const s = settings((s) => {
      s.shape = 'square';
      s.topText = { ...s.topText, text: 'Hello', curved: false, align: 'left' };
      s.bottomText = { ...s.bottomText, text: 'World', curved: false, align: 'right' };
    });
    const withText = buildCoaster(s, testAssets());
    expect(withText.warnings).toEqual([]);
    expect(withText.qr!.moduleSize).toBeLessThan(plain.qr!.moduleSize);
    expectSolid(withText);
    expect(scanCoaster(withText, s.slots)).toBe('https://example.com/coaster');
  });

  it('warns when the text cannot fit', () => {
    const s = settings(
      (s) => (s.topText = { ...s.topText, text: 'Far too much text for one coaster', curved: false, capHeight: 20 }),
    );
    expect(buildCoaster(s, testAssets()).warnings.join(' ')).toMatch(/too large/);
  });

  it('warns about low contrast', () => {
    const s = settings((s) => (s.slots = ['#ffffff', '#eeeeee']));
    expect(buildCoaster(s, testAssets()).warnings.join(' ')).toMatch(/contrast/);
  });

  it('warns when modules are narrower than two lines from the chosen nozzle', () => {
    // These modules are about 1.1 mm: comfortable for a 0.4 mm nozzle, too fine for a 0.8 mm one.
    const dense = (nozzle: number) =>
      settings((s) => {
        s.nozzle = nozzle;
        s.content.type = 'wifi';
        s.content.wifi = {
          ssid: 'Guest Network',
          password: 'correct horse battery staple',
          security: 'WPA',
          hidden: false,
        };
        s.logo = { ...s.logo, source: 'icon', iconId: 'wifi' };
      });
    const warnings = (nozzle: number) => buildCoaster(dense(nozzle), testAssets(iconArt(findIcon('wifi')!))).warnings;
    expect(warnings(0.4).join(' ')).not.toMatch(/modules/);
    expect(warnings(0.8).join(' ')).toMatch(/0\.8 mm nozzle/);
  });
});
