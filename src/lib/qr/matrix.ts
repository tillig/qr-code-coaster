import { create } from 'qrcode';

export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** Fraction of the code each error correction level can lose and still scan. */
export const RECOVERY: Record<ErrorCorrection, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

export interface QrMatrix {
  size: number;
  version: number;
  errorCorrection: ErrorCorrection;
  isDark(row: number, col: number): boolean;
}

export function createMatrix(text: string, errorCorrection: ErrorCorrection): QrMatrix {
  const qr = create(text, { errorCorrectionLevel: errorCorrection });
  const { size, data } = qr.modules;
  return {
    size,
    version: qr.version,
    errorCorrection,
    isDark: (row, col) => row >= 0 && col >= 0 && row < size && col < size && data[row * size + col] === 1,
  };
}

/** Finder patterns are the three 7×7 squares in the corners; [row, col] of their top-left module. */
export function finderOrigins(size: number): { row: number; col: number; corner: 'tl' | 'tr' | 'bl' }[] {
  return [
    { row: 0, col: 0, corner: 'tl' },
    { row: 0, col: size - 7, corner: 'tr' },
    { row: size - 7, col: 0, corner: 'bl' },
  ];
}

export function isFinderModule(size: number, row: number, col: number): boolean {
  return finderOrigins(size).some((f) => row >= f.row && row < f.row + 7 && col >= f.col && col < f.col + 7);
}
