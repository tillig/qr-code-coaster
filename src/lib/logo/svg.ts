import { transformCommands, type PathCommand } from '../geometry/path';
import { EndType, FillRule, JoinType } from '../geometry/shape';
import { artFromItems, svgPathToCommands, type LogoArt, type PaintItem } from './art';

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function parseTransform(value: string | null): Matrix {
  let result: Matrix = IDENTITY;
  if (!value) return result;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  for (const [, op, args] of value.matchAll(re)) {
    const a = args
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    let m: Matrix = IDENTITY;
    const rad = ((a[0] ?? 0) * Math.PI) / 180;
    switch (op) {
      case 'matrix':
        if (a.length === 6) m = a as Matrix;
        break;
      case 'translate':
        m = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        break;
      case 'scale':
        m = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        break;
      case 'rotate': {
        const [cx, cy] = [a[1] ?? 0, a[2] ?? 0];
        const r: Matrix = [Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), 0, 0];
        m = multiply(multiply([1, 0, 0, 1, cx, cy], r), [1, 0, 0, 1, -cx, -cy]);
        break;
      }
      case 'skewX':
        m = [1, 0, Math.tan(rad), 1, 0, 0];
        break;
      case 'skewY':
        m = [1, Math.tan(rad), 0, 1, 0, 0];
        break;
    }
    result = multiply(result, m);
  }
  return result;
}

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  lime: '#00ff00',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  aqua: '#00ffff',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  maroon: '#800000',
  olive: '#808000',
  purple: '#800080',
  teal: '#008080',
  navy: '#000080',
  orange: '#ffa500',
};

const hex2 = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');

/** Normalizes a CSS color to #rrggbb, or returns null when it is not a solid color this parser understands. */
export function parseColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (NAMED_COLORS[v]) return NAMED_COLORS[v];
  let m = /^#([\da-f])([\da-f])([\da-f])([\da-f])?$/.exec(v);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`;
  m = /^#([\da-f]{6})([\da-f]{2})?$/.exec(v);
  if (m) return `#${m[1]}`;
  m = /^rgba?\(\s*([\d.]+)(%?)[\s,]+([\d.]+)(%?)[\s,]+([\d.]+)(%?)/.exec(v);
  if (m) {
    const channel = (n: string, pct: string) => (pct ? (Number(n) * 255) / 100 : Number(n));
    return `#${hex2(channel(m[1], m[2]))}${hex2(channel(m[3], m[4]))}${hex2(channel(m[5], m[6]))}`;
  }
  return null;
}

interface Style {
  fill: string;
  fillRule: string;
  stroke: string;
  strokeWidth: string;
  strokeLinejoin: string;
  strokeLinecap: string;
  color: string;
  visibility: string;
}

const INHERITED_DEFAULTS: Style = {
  fill: '#000000',
  fillRule: 'nonzero',
  stroke: 'none',
  strokeWidth: '1',
  strokeLinejoin: 'miter',
  strokeLinecap: 'butt',
  color: '#000000',
  visibility: 'visible',
};

const STYLE_KEYS: Record<string, keyof Style | 'display' | 'opacity' | 'fill-opacity' | 'stroke-opacity'> = {
  fill: 'fill',
  'fill-rule': 'fillRule',
  stroke: 'stroke',
  'stroke-width': 'strokeWidth',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-linecap': 'strokeLinecap',
  color: 'color',
  visibility: 'visibility',
  display: 'display',
  opacity: 'opacity',
  'fill-opacity': 'fill-opacity',
  'stroke-opacity': 'stroke-opacity',
};

function parseDeclarations(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const decl of text.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const key = decl.slice(0, i).trim().toLowerCase();
    const value = decl
      .slice(i + 1)
      .replace(/!important/, '')
      .trim();
    if (key in STYLE_KEYS) result[key] = value;
  }
  return result;
}

interface CssRule {
  selector: string;
  declarations: Record<string, string>;
}

function parseStylesheets(doc: Document): CssRule[] {
  const rules: CssRule[] = [];
  for (const el of Array.from(doc.getElementsByTagName('style'))) {
    const css = (el.textContent ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const declarations = parseDeclarations(body);
      for (const selector of selectors.split(',')) rules.push({ selector: selector.trim(), declarations });
    }
  }
  return rules;
}

/** Matches the simple selectors design tools emit: tag, .class, #id, and combinations like path.cls-1. */
function matches(el: Element, selector: string): boolean {
  if (!/^[a-z\d_-]*(?:[.#][a-z\d_-]+)*$/i.test(selector) || !selector) return false;
  const tag = /^[a-z\d_-]+/i.exec(selector)?.[0];
  if (tag && tag.toLowerCase() !== el.localName.toLowerCase()) return false;
  const classes = (el.getAttribute('class') ?? '').split(/\s+/);
  for (const [, kind, name] of selector.matchAll(/([.#])([a-z\d_-]+)/gi)) {
    if (kind === '.' && !classes.includes(name)) return false;
    if (kind === '#' && el.getAttribute('id') !== name) return false;
  }
  return true;
}

function num(value: string | null, fallback = 0): number {
  if (value === null) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function shapeToPathData(el: Element): string | null {
  const a = (name: string) => num(el.getAttribute(name));
  switch (el.localName) {
    case 'path':
      return el.getAttribute('d');
    case 'rect': {
      const [x, y, w, h] = [a('x'), a('y'), a('width'), a('height')];
      if (w <= 0 || h <= 0) return null;
      let rx = el.hasAttribute('rx') ? a('rx') : a('ry');
      let ry = el.hasAttribute('ry') ? a('ry') : rx;
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      if (rx <= 0 || ry <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return (
        `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}` +
        `A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}` +
        `V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
      );
    }
    case 'circle':
    case 'ellipse': {
      const [cx, cy] = [a('cx'), a('cy')];
      const rx = el.localName === 'circle' ? a('r') : a('rx');
      const ry = el.localName === 'circle' ? a('r') : a('ry');
      if (rx <= 0 || ry <= 0) return null;
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    }
    case 'polygon':
    case 'polyline': {
      const pts = (el.getAttribute('points') ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      if (pts.length < 4) return null;
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      return el.localName === 'polygon' ? d + 'Z' : d;
    }
    case 'line':
      return `M${a('x1')} ${a('y1')}L${a('x2')} ${a('y2')}`;
    default:
      return null;
  }
}

const SKIPPED = new Set([
  'defs',
  'clipPath',
  'mask',
  'pattern',
  'marker',
  'symbol',
  'linearGradient',
  'radialGradient',
  'title',
  'desc',
  'metadata',
  'style',
  'script',
  'filter',
]);

const JOINS: Record<string, JoinType> = { miter: JoinType.Miter, round: JoinType.Round, bevel: JoinType.Bevel };
const CAPS: Record<string, EndType> = { butt: EndType.Butt, round: EndType.Round, square: EndType.Square };

export interface ParsedSvg {
  art: LogoArt;
  warnings: string[];
}

/** Converts an SVG document into solid-color artwork. Gradients become their first color; raster images and text are skipped. */
export function parseSvg(source: string): ParsedSvg {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) {
    throw new Error('This file is not a valid SVG image.');
  }
  const rules = parseStylesheets(doc);
  const warnings = new Set<string>();
  const items: PaintItem[] = [];

  const resolvePaint = (value: string, style: Style): string | null => {
    const v = value.trim();
    if (v === 'none' || v === 'transparent') return null;
    if (v === 'currentColor') return parseColor(style.color);
    const ref = /^url\(\s*['"]?#([^'")]+)['"]?\s*\)/.exec(v);
    if (ref) {
      const target = doc.getElementById(ref[1]);
      const stop = target?.getElementsByTagName('stop')[0];
      warnings.add('Gradients were replaced with a solid color.');
      if (!stop) return null;
      const stopColor =
        parseDeclarations(stop.getAttribute('style') ?? '')['stop-color'] ??
        stop.getAttribute('stop-color') ??
        '#000000';
      return parseColor(stopColor);
    }
    const color = parseColor(v);
    if (!color) warnings.add(`Unrecognized color "${v}" was skipped.`);
    return color;
  };

  const visit = (el: Element, inherited: Style, matrix: Matrix, depth: number) => {
    if (depth > 32 || SKIPPED.has(el.localName)) return;
    if (el.localName === 'image') {
      warnings.add('Embedded raster images were skipped; only vector shapes are used.');
      return;
    }
    if (el.localName === 'text') {
      warnings.add('Text in the SVG was skipped; convert text to outlines before uploading.');
      return;
    }

    const declared: Record<string, string> = {};
    for (const attr of Object.keys(STYLE_KEYS)) {
      const value = el.getAttribute(attr);
      if (value !== null) declared[attr] = value;
    }
    for (const rule of rules) if (matches(el, rule.selector)) Object.assign(declared, rule.declarations);
    Object.assign(declared, parseDeclarations(el.getAttribute('style') ?? ''));
    if (declared.display === 'none') return;

    const style: Style = { ...inherited };
    for (const [key, value] of Object.entries(declared)) {
      const prop = STYLE_KEYS[key];
      if (value !== 'inherit' && prop in style) style[prop as keyof Style] = value;
    }
    if (declared['fill-opacity'] !== undefined && num(declared['fill-opacity'], 1) === 0) style.fill = 'none';
    if (declared['stroke-opacity'] !== undefined && num(declared['stroke-opacity'], 1) === 0) style.stroke = 'none';
    if (declared.opacity !== undefined && num(declared.opacity, 1) === 0) return;
    if (declared.opacity !== undefined && num(declared.opacity, 1) < 1) {
      warnings.add('Transparency was ignored; every shape prints as a solid color.');
    }

    let m = multiply(matrix, parseTransform(el.getAttribute('transform')));

    if (el.localName === 'use') {
      const href = el.getAttribute('href') ?? el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      const target = href?.startsWith('#') ? doc.getElementById(href.slice(1)) : null;
      if (!target) return;
      m = multiply(m, [1, 0, 0, 1, num(el.getAttribute('x')), num(el.getAttribute('y'))]);
      const children = target.localName === 'symbol' ? Array.from(target.children) : [target];
      for (const child of children) visit(child, style, m, depth + 1);
      return;
    }
    if (el.localName === 'svg' && depth > 0) {
      m = multiply(m, [1, 0, 0, 1, num(el.getAttribute('x')), num(el.getAttribute('y'))]);
    }

    const d = shapeToPathData(el);
    if (d) {
      if (style.visibility === 'hidden' || style.visibility === 'collapse') return;
      const commands = transformCommands(svgPathToCommands(d), (p) => ({
        x: m[0] * p.x + m[2] * p.y + m[4],
        y: m[1] * p.x + m[3] * p.y + m[5],
      })) as PathCommand[];
      const fillColor = el.localName === 'line' ? null : resolvePaint(style.fill, style);
      if (fillColor) {
        items.push({
          color: fillColor,
          commands,
          fillRule: style.fillRule === 'evenodd' ? FillRule.EvenOdd : FillRule.NonZero,
        });
      }
      const strokeColor = resolvePaint(style.stroke, style);
      const width = num(style.strokeWidth, 1) * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
      if (strokeColor && width > 0) {
        items.push({
          color: strokeColor,
          commands,
          stroke: {
            width,
            join: JOINS[style.strokeLinejoin] ?? JoinType.Miter,
            cap: CAPS[style.strokeLinecap] ?? EndType.Butt,
          },
        });
      }
      return;
    }

    for (const child of Array.from(el.children)) visit(child, style, m, depth + 1);
  };

  visit(root, INHERITED_DEFAULTS, IDENTITY, 0);
  const art = artFromItems(items);
  if (!art || !art.layers.length) throw new Error('No filled shapes were found in this SVG.');
  return { art, warnings: [...warnings] };
}
