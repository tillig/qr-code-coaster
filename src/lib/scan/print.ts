import type { BuildResult } from '../coaster/build';
import { lineWidth } from '../coaster/settings';
import { clean, difference, intersect, JoinType, offset, union, type Shape } from '../geometry/shape';

/** Smaller losses are ignored: every print rounds sharp corners about this much. */
const IGNORED_AREA = 0.05;

export interface PrintSimulation {
  /** The top surface as it would print, painted in order so later regions cover earlier ones. */
  regions: { slot: number; shape: Shape }[];
  /** Details too thin to print: ink that disappears and gaps that fill in. */
  lost: Shape;
}

/** Removes every part of a region narrower than twice the radius, the way a nozzle of that line width would. */
const printable = (shape: Shape, radius: number) =>
  offset(offset(shape, -radius, JoinType.Round), radius, JoinType.Round);

/** Predicts what survives printing with the given nozzle: thin ink vanishes, and thin base-color gaps fill with ink. */
export function simulatePrint(result: BuildResult, nozzle: number): PrintSimulation {
  const radius = lineWidth(nozzle) / 2;
  const regions = [{ slot: result.baseSlot, shape: result.footprint }];
  const lost: Shape[] = [];
  const ink = result.regions.filter((r) => r.slot !== result.baseSlot);
  for (const r of ink) {
    const printed = printable(r.shape, radius);
    regions.push({ slot: r.slot, shape: printed });
    lost.push(difference(r.shape, printed));
  }
  const base = result.regions.find((r) => r.slot === result.baseSlot);
  if (base) {
    const gaps = difference(base.shape, printable(base.shape, radius));
    for (const r of ink)
      regions.push({ slot: r.slot, shape: intersect(gaps, offset(r.shape, radius, JoinType.Round)) });
    lost.push(gaps);
  }
  return { regions, lost: clean(union(lost), IGNORED_AREA) };
}
