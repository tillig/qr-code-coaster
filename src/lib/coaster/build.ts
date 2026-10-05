import type { Font } from 'opentype.js';
import { circle, rect, roundedRect } from '../geometry/primitives';
import {
  area,
  bounds,
  clean,
  difference,
  intersect,
  mapPoints,
  offset,
  translate,
  union,
  type Shape,
} from '../geometry/shape';
import type { LogoArt } from '../logo/art';
import { extrude, type Mesh } from '../mesh/extrude';
import { encodeContent } from '../qr/content';
import { createMatrix, isFinderModule, type ErrorCorrection, type QrMatrix } from '../qr/matrix';
import { finderShapes, moduleShapes, type Grid } from '../qr/styles';
import { layoutArc, layoutLine } from '../text/text';
import { fitLayout, TEXT_GAP, type Rect, type TextBox } from './layout';
import { luminance, MAX_SLOTS, nearestSlot, type CoasterSettings, type TextSettings } from './settings';

/** Colored regions grow by this much before overlaps are resolved, so shapes that touch only at a corner merge cleanly. */
const WELD = 0.005;

/** Logo artwork fills this share of its badge. */
const BADGE_ART_SCALE = 0.62;

export interface CoasterPart {
  name: string;
  slot: number;
  mesh: Mesh;
}

export interface BuildAssets {
  font(id: string): Font | undefined;
  logo: LogoArt | null;
}

export interface BuildResult {
  parts: CoasterPart[];
  /** The top surface split by color slot. */
  regions: { slot: number; shape: Shape }[];
  /** Diameter or side length actually built, after clamping to the supported range. */
  size: number;
  warnings: string[];
  payload: string;
  qr: { version: number; modules: number; moduleSize: number; errorCorrection: ErrorCorrection } | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

interface Painted {
  slot: number;
  shape: Shape;
}

function measuredText(t: TextSettings, assets: BuildAssets, warnings: string[], label: string) {
  if (!t.text.trim()) return null;
  const font = assets.font(t.fontId);
  if (!font) {
    warnings.push(`The font for the ${label} text is still loading.`);
    return null;
  }
  const capHeight = clamp(t.capHeight, 2, 30);
  const line = layoutLine(font, t.text, capHeight);
  if (line.missing.length) {
    warnings.push(`The ${label} text font has no characters for: ${line.missing.join(' ')}`);
  }
  return { settings: t, font, capHeight, line };
}

export function buildCoaster(input: CoasterSettings, assets: BuildAssets): BuildResult {
  const warnings: string[] = [];
  const slotCount = clamp(input.slots.length, 1, MAX_SLOTS);
  const slot = (s: number) => clamp(Math.round(s), 0, slotCount - 1);
  const size = clamp(input.size, 30, 300);
  const thickness = clamp(input.thickness, 1, 20);
  const inlayDepth = clamp(input.inlayDepth, 0.2, thickness - 0.4);
  const margin = clamp(input.margin, 0, size / 4);
  const round = input.shape === 'circle';
  const baseSlot = slot(input.baseSlot);
  const half = size / 2 - margin;

  const footprint = round ? circle(0, 0, size / 2) : rect(0, 0, size, size);
  const painted: Painted[] = [];

  // Text first, because the code takes whatever room is left.
  const texts = {
    top: measuredText(input.topText, assets, warnings, 'top'),
    bottom: measuredText(input.bottomText, assets, warnings, 'bottom'),
  };
  const curved = (t: (typeof texts)['top']) => !!t && round && t.settings.curved;
  const band = (t: (typeof texts)['top']) => (t ? t.line.yMax - t.line.yMin : 0);
  const ringInset = Math.max(curved(texts.top) ? band(texts.top) : 0, curved(texts.bottom) ? band(texts.bottom) : 0);
  const innerHalf = ringInset > 0 ? half - ringInset - TEXT_GAP : half;
  const straightBox = (t: (typeof texts)['top']): TextBox | undefined =>
    t && !curved(t) ? { width: t.line.width, height: band(t), align: t.settings.align } : undefined;

  const payload = encodeContent(input.content);
  let matrix: QrMatrix | null = null;
  const hasLogo = !!assets.logo && input.logo.source !== 'none';
  const ecc: ErrorCorrection = input.errorCorrection === 'auto' ? (hasLogo ? 'H' : 'M') : input.errorCorrection;
  if (!payload) {
    warnings.push('Enter something to encode in the QR code.');
  } else {
    try {
      matrix = createMatrix(payload, ecc);
    } catch {
      warnings.push('There is too much content to fit in a QR code. Shorten it or lower the error correction level.');
    }
  }

  const quietZone = clamp(Math.round(input.quietZone), 0, 6);
  const codeModules = matrix?.size ?? 21;
  const layout = fitLayout({
    shape: input.shape,
    half: innerHalf,
    codeModules,
    blockModules: codeModules + 2 * quietZone,
    top: straightBox(texts.top),
    bottom: straightBox(texts.bottom),
  });
  if (!layout.fits) warnings.push('The text is too large to fit on the coaster. Make it smaller or shorter.');

  let qrInfo: BuildResult['qr'] = null;
  if (matrix && layout.blockSide > 0) {
    const m = layout.blockSide / (matrix.size + 2 * quietZone);
    const codeSide = m * matrix.size;
    const cx = (layout.block.x0 + layout.block.x1) / 2;
    const cy = (layout.block.y0 + layout.block.y1) / 2;
    const grid: Grid = { left: cx - codeSide / 2, top: cy + codeSide / 2, module: m };
    qrInfo = { version: matrix.version, modules: matrix.size, moduleSize: m, errorCorrection: ecc };

    if (m < 0.8) warnings.push(`QR modules are only ${m.toFixed(2)} mm wide, which is too small to print reliably.`);
    else if (m < 1.2) warnings.push(`QR modules are ${m.toFixed(2)} mm wide; fine detail like this may print poorly.`);

    // The logo goes on top of the code, so work out which modules it hides first.
    let cleared: (r: number, c: number) => boolean = () => false;
    const logoParts: Painted[] = [];
    if (hasLogo && assets.logo) {
      const logoSide = (clamp(input.logo.size, 5, 40) / 100) * codeSide;
      const badge = input.logo.badge;
      let clearance: Shape;
      let artSide = logoSide;
      if (badge !== 'none') {
        const r = logoSide / 2;
        const badgeShape =
          badge === 'circle'
            ? circle(cx, cy, r)
            : roundedRect(
                cx,
                cy,
                logoSide,
                logoSide,
                badge === 'rounded' ? [r / 2, r / 2, r / 2, r / 2] : [0, 0, 0, 0],
              );
        logoParts.push({ slot: slot(input.logo.badgeSlot), shape: badgeShape });
        clearance = badgeShape;
        artSide = logoSide * BADGE_ART_SCALE;
      } else {
        clearance = [];
      }
      const art = assets.logo;
      const scale = artSide / Math.max(art.width, art.height);
      const place = (s: Shape) =>
        mapPoints(s, (p) => ({ x: cx + (p.x - art.width / 2) * scale, y: cy + (p.y - art.height / 2) * scale }));
      for (const layer of art.layers) {
        const target =
          input.logo.source === 'icon'
            ? input.logo.iconSlot
            : input.logo.uploadSlots[layer.color] !== undefined
              ? input.logo.uploadSlots[layer.color]
              : nearestSlot(layer.color, input.slots.slice(0, slotCount));
        if (target === null) continue;
        logoParts.push({ slot: slot(target), shape: place(layer.shape) });
      }
      if (!clearance.length) {
        const all = union(art.layers.map((l) => place(l.shape)));
        const b = bounds(all);
        clearance = b ? rect((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, b.maxX - b.minX, b.maxY - b.minY) : [];
      }
      clearance = offset(clearance, m / 2);
      const cb = bounds(clearance);
      const hidden = new Set<number>();
      if (cb) {
        for (let r = 0; r < matrix.size; r++) {
          for (let c = 0; c < matrix.size; c++) {
            const x = grid.left + (c + 0.5) * m;
            const y = grid.top - (r + 0.5) * m;
            if (x + m / 2 < cb.minX || x - m / 2 > cb.maxX || y + m / 2 < cb.minY || y - m / 2 > cb.maxY) continue;
            if (area(intersect(rect(x, y, m, m), clearance)) > 0.05 * m * m) hidden.add(r * matrix.size + c);
          }
        }
      }
      cleared = (r, c) => hidden.has(r * matrix!.size + c);
    }

    const mx = matrix;
    const body = moduleShapes(
      mx.size,
      (r, c) => mx.isDark(r, c) && !isFinderModule(mx.size, r, c) && !cleared(r, c),
      input.moduleStyle,
      grid,
    );
    painted.push({ slot: slot(input.moduleSlot), shape: body });
    const finders = finderShapes(mx, input.frameStyle, input.centerStyle, grid);
    painted.push({ slot: slot(input.frameSlot), shape: finders.frames });
    painted.push({ slot: slot(input.centerSlot), shape: finders.centers });
    painted.push(...logoParts);

    const dark = [input.moduleSlot, input.frameSlot, input.centerSlot].map((s) => luminance(input.slots[slot(s)]));
    const light = luminance(input.slots[baseSlot]);
    if (dark.some((d) => Math.abs(light - d) < 0.35)) {
      warnings.push('The QR code colors are close to the coaster color. Scanners need strong contrast.');
    } else if (dark.some((d) => d > light)) {
      warnings.push('The code is lighter than its background. Some scanners cannot read inverted codes.');
    }
  }

  const placeText = (t: (typeof texts)['top'], where: 'top' | 'bottom', box?: Rect) => {
    if (!t) return;
    let shape: Shape;
    if (curved(t)) {
      const radius = where === 'top' ? half - t.line.yMax : half + t.line.yMin;
      const arc = layoutArc(t.font, t.settings.text, t.capHeight, radius, where);
      if (arc.arcLength > Math.PI * radius * 0.95) {
        warnings.push(`The ${where} text wraps too far around the edge. Make it smaller or shorter.`);
      }
      shape = arc.shape;
    } else {
      if (!box) return;
      shape = translate(t.line.shape, box.x0, box.y0 - t.line.yMin);
    }
    painted.push({ slot: slot(t.settings.slot), shape });
  };
  placeText(texts.top, 'top', layout.top);
  placeText(texts.bottom, 'bottom', layout.bottom);

  // Resolve overlaps so later items cover earlier ones and every point on the top belongs to exactly one slot.
  const bySlot = new Map<number, Shape[]>();
  let covered: Shape = [];
  for (let i = painted.length - 1; i >= 0; i--) {
    const grown = offset(painted[i].shape, WELD);
    const visible = intersect(difference(grown, covered), footprint);
    covered = union([covered, grown]);
    if (painted[i].slot === baseSlot || !visible.length) continue;
    bySlot.set(painted[i].slot, [...(bySlot.get(painted[i].slot) ?? []), visible]);
  }

  const regions: BuildResult['regions'] = [];
  for (const [s, shapes] of bySlot) {
    const shape = clean(union(shapes));
    if (shape.length) regions.push({ slot: s, shape });
  }
  const baseTop = clean(difference(footprint, union(regions.map((r) => r.shape))));
  regions.unshift({ slot: baseSlot, shape: baseTop });
  regions.sort((a, b) => a.slot - b.slot);

  const floor = thickness - inlayDepth;
  const parts: CoasterPart[] = [{ name: 'Base', slot: baseSlot, mesh: extrude(footprint, 0, floor) }];
  for (const r of regions) {
    if (!r.shape.length) continue;
    parts.push({ name: `Top, filament ${r.slot + 1}`, slot: r.slot, mesh: extrude(r.shape, floor, thickness) });
  }

  return { parts, regions, size, warnings, payload, qr: qrInfo };
}
