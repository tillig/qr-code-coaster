import { toSvgPath } from '../lib/geometry/shape';
import {
  centerShape,
  frameShape,
  moduleShapes,
  type CenterStyle,
  type FrameStyle,
  type ModuleStyle,
} from '../lib/qr/styles';

// A fixed scrap of QR-like pattern, so each style thumbnail is drawn by the same code that builds the coaster.
const SAMPLE = ['1101101', '1011001', '0111110', '1100011', '0110110', '1011101', '1110011'];

export const THUMBNAIL_VIEWBOX = '-0.5 -7.5 8 8';

export function moduleThumbnail(style: ModuleStyle): string {
  const shape = moduleShapes(7, (r, c) => SAMPLE[r][c] === '1', style, { left: 0, top: 7, module: 1 });
  return toSvgPath(shape);
}

export function frameThumbnail(style: FrameStyle): string {
  return toSvgPath(frameShape(style, 'tl', 3.5, 3.5, 1));
}

export function centerThumbnail(style: CenterStyle): string {
  return toSvgPath(centerShape(style, 'tl', 3.5, 3.5, 2));
}
