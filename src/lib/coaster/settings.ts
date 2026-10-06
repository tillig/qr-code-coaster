import { defaultContent, type QrContent } from '../qr/content';
import type { ErrorCorrection } from '../qr/matrix';
import type { CenterStyle, FrameStyle, ModuleStyle } from '../qr/styles';
import { DEFAULT_FONT_ID } from '../text/fonts';

/** Bambu AMS units hold four spools, and keeping to four avoids extra filament swaps. */
export const MAX_SLOTS = 4;

export const NOZZLES = [0.2, 0.4, 0.6, 0.8];

/** Width of one extruded line; slicers default to slightly wider than the nozzle. */
export const lineWidth = (nozzle: number) => nozzle + 0.02;

export const MIN_INLAY_DEPTH = 0.2;

// The tolerance keeps values like 1.2 - 0.4 = 0.7999… from rounding down a whole step.
const floorTenth = (v: number) => Math.floor(v * 10 + 1e-9) / 10;

/** Deepest the colors can go, to the nearest 0.1 mm below, leaving at least 0.4 mm of solid base underneath. */
export const maxInlayDepth = (thickness: number) => Math.max(MIN_INLAY_DEPTH, floorTenth(thickness - 0.4));

/**
 * Largest edge rounding a coaster can take, to the nearest 0.1 mm below. The top rounding and the bottom bevel
 * (half as tall) must fit within the thickness with a straight section left between them.
 */
export const maxEdge = (thickness: number, size: number) =>
  Math.max(0, floorTenth(Math.min((2 * thickness) / 3, size / 4)));

export type Alignment = 'left' | 'center' | 'right';

export interface TextSettings {
  text: string;
  fontId: string;
  /** Height of capital letters in millimeters. */
  capHeight: number;
  align: Alignment;
  /** Follow the edge of a round coaster instead of a straight line. */
  curved: boolean;
  slot: number;
}

export type LogoSource = 'none' | 'icon' | 'upload';
export type Badge = 'none' | 'circle' | 'rounded' | 'square';

export interface LogoSettings {
  source: LogoSource;
  iconId: string;
  iconSlot: number;
  /** Slot for each color found in an uploaded SVG, or null to leave that color out. */
  uploadSlots: Record<string, number | null>;
  /** Logo width as a percentage of the code width. */
  size: number;
  badge: Badge;
  badgeSlot: number;
}

export interface CoasterSettings {
  shape: 'circle' | 'square';
  /** Diameter of a round coaster or side length of a square one, in millimeters. */
  size: number;
  thickness: number;
  /** How deep the colored inlay goes into the top surface. */
  inlayDepth: number;
  /** Clear space between the coaster edge and the artwork. */
  margin: number;
  /** Radius of the rounded top edge; the bottom gets a 45° bevel half this size. 0 leaves both sharp. */
  edge: number;
  /** Corner radius of a square coaster; 0 for sharp corners. */
  cornerRadius: number;
  /** Printer nozzle diameter, used to check which details are too fine to print. */
  nozzle: number;
  /** Filament colors as #rrggbb, one per slot. */
  slots: string[];
  baseSlot: number;
  content: QrContent;
  errorCorrection: 'auto' | ErrorCorrection;
  /** Blank border around the code, in modules. */
  quietZone: number;
  moduleStyle: ModuleStyle;
  moduleSlot: number;
  frameStyle: FrameStyle;
  frameSlot: number;
  centerStyle: CenterStyle;
  centerSlot: number;
  logo: LogoSettings;
  topText: TextSettings;
  bottomText: TextSettings;
}

export function defaultText(): TextSettings {
  return { text: '', fontId: DEFAULT_FONT_ID, capHeight: 6, align: 'center', curved: true, slot: 1 };
}

export function defaultSettings(): CoasterSettings {
  return {
    shape: 'circle',
    size: 100,
    thickness: 2.5,
    inlayDepth: 0.6,
    margin: 4,
    edge: 0.8,
    cornerRadius: 6,
    nozzle: 0.4,
    slots: ['#ffffff', '#000000'],
    baseSlot: 0,
    content: defaultContent(),
    errorCorrection: 'auto',
    quietZone: 1,
    moduleStyle: 'square',
    moduleSlot: 1,
    frameStyle: 'square',
    frameSlot: 1,
    centerStyle: 'square',
    centerSlot: 1,
    logo: { source: 'none', iconId: 'wifi', iconSlot: 1, uploadSlots: {}, size: 25, badge: 'none', badgeSlot: 1 },
    topText: defaultText(),
    bottomText: defaultText(),
  };
}

/** Removes a filament slot. Anything that used it moves to the coaster's base slot, and later slots shift down. */
export function removeSlot(s: CoasterSettings, index: number): void {
  if (s.slots.length <= 1 || index < 0 || index >= s.slots.length) return;
  const fallback = s.baseSlot === index ? 0 : s.baseSlot;
  const remap = (slot: number) => {
    const moved = slot === index ? fallback : slot;
    return moved > index ? moved - 1 : moved;
  };
  s.slots.splice(index, 1);
  s.baseSlot = remap(s.baseSlot);
  s.moduleSlot = remap(s.moduleSlot);
  s.frameSlot = remap(s.frameSlot);
  s.centerSlot = remap(s.centerSlot);
  s.logo.iconSlot = remap(s.logo.iconSlot);
  s.logo.badgeSlot = remap(s.logo.badgeSlot);
  for (const [color, slot] of Object.entries(s.logo.uploadSlots)) {
    if (slot !== null) s.logo.uploadSlots[color] = remap(slot);
  }
  s.topText.slot = remap(s.topText.slot);
  s.bottomText.slot = remap(s.bottomText.slot);
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Perceived lightness from 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function nearestSlot(color: string, slots: string[]): number {
  const [r, g, b] = rgb(color);
  let best = 0;
  let bestDistance = Infinity;
  slots.forEach((slot, i) => {
    const [sr, sg, sb] = rgb(slot);
    const distance = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}
