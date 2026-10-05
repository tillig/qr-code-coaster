import type { BuildResult } from '../lib/coaster/build';
import type { CoasterSettings } from '../lib/coaster/settings';
import type { LogoArt } from '../lib/logo/art';

export type WorkerRequest =
  | { type: 'font'; id: string; buffer: ArrayBuffer }
  | { type: 'build'; id: number; settings: CoasterSettings; upload: LogoArt | null }
  | { type: 'export'; id: number; settings: CoasterSettings; upload: LogoArt | null; title: string };

export interface PreviewPart {
  name: string;
  slot: number;
  positions: Float32Array;
  triangles: Uint32Array;
}

export interface CheckResult {
  /** The design as drawn decodes to its content. */
  readable: boolean;
  /** A simulated print with the chosen nozzle still decodes. */
  printReadable: boolean;
  /** Square millimeters of detail too thin for the nozzle. */
  lostArea: number;
  /** A thin layer over the top surface marking those details. */
  highlight: { positions: Float32Array; triangles: Uint32Array } | null;
}

export type WorkerResponse =
  | {
      type: 'built';
      id: number;
      parts: PreviewPart[];
      warnings: string[];
      qr: BuildResult['qr'];
      payloadLength: number;
    }
  | { type: 'checked'; id: number; check: CheckResult }
  | { type: 'exported'; id: number; bytes: Uint8Array }
  | { type: 'font-error'; id: string; message: string }
  | { type: 'error'; id: number; message: string };
