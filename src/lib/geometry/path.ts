import type { Point } from './shape';

/** Absolute path commands shared by font outlines and SVG paths. */
export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'Q'; x1: number; y1: number; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Z' };

export interface Polyline {
  points: Point[];
  closed: boolean;
}

function steps(deviation: number, tolerance: number): number {
  return Math.min(128, Math.max(1, Math.ceil(Math.sqrt(deviation / tolerance))));
}

/** Converts curves to line segments whose error stays within the tolerance. */
export function flatten(commands: PathCommand[], tolerance: number): Polyline[] {
  const result: Polyline[] = [];
  let current: Point[] = [];
  let start: Point = { x: 0, y: 0 };
  let pen: Point = { x: 0, y: 0 };

  const finish = (closed: boolean) => {
    if (current.length > 1) result.push({ points: current, closed });
    current = [];
  };

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        finish(false);
        pen = start = { x: cmd.x, y: cmd.y };
        current = [pen];
        break;
      case 'L':
        pen = { x: cmd.x, y: cmd.y };
        current.push(pen);
        break;
      case 'Q': {
        const dx = pen.x - 2 * cmd.x1 + cmd.x;
        const dy = pen.y - 2 * cmd.y1 + cmd.y;
        const n = steps(Math.hypot(dx, dy) / 4, tolerance);
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const u = 1 - t;
          current.push({
            x: u * u * pen.x + 2 * u * t * cmd.x1 + t * t * cmd.x,
            y: u * u * pen.y + 2 * u * t * cmd.y1 + t * t * cmd.y,
          });
        }
        pen = { x: cmd.x, y: cmd.y };
        break;
      }
      case 'C': {
        const d1 = Math.hypot(pen.x - 2 * cmd.x1 + cmd.x2, pen.y - 2 * cmd.y1 + cmd.y2);
        const d2 = Math.hypot(cmd.x1 - 2 * cmd.x2 + cmd.x, cmd.y1 - 2 * cmd.y2 + cmd.y);
        const n = steps(0.75 * Math.max(d1, d2), tolerance);
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const u = 1 - t;
          current.push({
            x: u * u * u * pen.x + 3 * u * u * t * cmd.x1 + 3 * u * t * t * cmd.x2 + t * t * t * cmd.x,
            y: u * u * u * pen.y + 3 * u * u * t * cmd.y1 + 3 * u * t * t * cmd.y2 + t * t * t * cmd.y,
          });
        }
        pen = { x: cmd.x, y: cmd.y };
        break;
      }
      case 'Z':
        finish(true);
        pen = start;
        break;
    }
  }
  finish(false);
  return result;
}

export function transformCommands(commands: PathCommand[], fn: (p: Point) => Point): PathCommand[] {
  return commands.map((cmd) => {
    switch (cmd.type) {
      case 'M':
      case 'L': {
        const p = fn(cmd);
        return { type: cmd.type, x: p.x, y: p.y };
      }
      case 'Q': {
        const c = fn({ x: cmd.x1, y: cmd.y1 });
        const p = fn(cmd);
        return { type: 'Q', x1: c.x, y1: c.y, x: p.x, y: p.y };
      }
      case 'C': {
        const c1 = fn({ x: cmd.x1, y: cmd.y1 });
        const c2 = fn({ x: cmd.x2, y: cmd.y2 });
        const p = fn(cmd);
        return { type: 'C', x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, x: p.x, y: p.y };
      }
      case 'Z':
        return cmd;
    }
  });
}
