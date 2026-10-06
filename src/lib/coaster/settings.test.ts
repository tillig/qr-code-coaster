import { describe, expect, it } from 'vitest';
import { defaultSettings, maxEdge, maxInlayDepth, nearestSlot, removeSlot } from './settings';

describe('removeSlot', () => {
  it('moves users of the removed slot to the base and shifts later slots down', () => {
    const s = defaultSettings();
    s.slots = ['#ffffff', '#000000', '#ff0000', '#0000ff'];
    s.moduleSlot = 1;
    s.frameSlot = 2;
    s.centerSlot = 3;
    s.logo.uploadSlots = { '#123456': 3, '#abcdef': null };
    removeSlot(s, 2);
    expect(s.slots).toEqual(['#ffffff', '#000000', '#0000ff']);
    expect([s.baseSlot, s.moduleSlot, s.frameSlot, s.centerSlot]).toEqual([0, 1, 0, 2]);
    expect(s.logo.uploadSlots).toEqual({ '#123456': 2, '#abcdef': null });
  });

  it('keeps at least one slot', () => {
    const s = defaultSettings();
    s.slots = ['#ffffff'];
    removeSlot(s, 0);
    expect(s.slots).toEqual(['#ffffff']);
  });
});

describe('nearestSlot', () => {
  it('picks the closest filament color', () => {
    expect(nearestSlot('#f01010', ['#ffffff', '#000000', '#ff0000'])).toBe(2);
    expect(nearestSlot('#222222', ['#ffffff', '#000000', '#ff0000'])).toBe(1);
  });
});

describe('maxEdge', () => {
  it('leaves room for the top rounding and the bottom bevel within the thickness', () => {
    expect(maxEdge(2.5, 100)).toBe(1.6);
    expect(maxEdge(6, 100)).toBe(4);
    expect(maxEdge(6, 10)).toBe(2.5);
  });
});

describe('maxInlayDepth', () => {
  it('leaves at least 0.4 mm of solid base under the colors', () => {
    expect(maxInlayDepth(2.5)).toBe(2.1);
    expect(maxInlayDepth(1.25)).toBe(0.8);
    expect(maxInlayDepth(1.2)).toBe(0.8);
    expect(maxInlayDepth(0.5)).toBe(0.2);
  });
});
