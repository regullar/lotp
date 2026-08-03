export const LOTP_MAGIC = new Uint8Array([0x4c, 0x4f, 0x54, 0x50]); // "LOTP"
export const LOTP_VERSION = 1;

export const FrameType = {
  MANIFEST: 0x01,
  DATA: 0x02,
  FEEDBACK: 0x03,
} as const;
export type FrameType = typeof FrameType[keyof typeof FrameType];

export const PaletteMode = {
  MONO_1BIT: 0,   // Black/White
  GRAY_2BIT: 1,   // 4 Grayscale levels
  COLOR_2BIT: 2,  // 4 Colors (Red, Green, Blue, White)
  COLOR_3BIT: 3,  // 8 Colors
} as const;
export type PaletteMode = typeof PaletteMode[keyof typeof PaletteMode];

export interface LOTPProfile {
  id: 'reliable' | 'balanced' | 'fast' | 'turbo' | 'manual';
  name: string;
  description: string;
  gridRows: number;
  gridCols: number;
  paletteMode: PaletteMode;
  targetFPS: number;
  rsEccBytes: number; // Reed-Solomon parity bytes per tile
  tilesCount: number;
  fountainBlockSize: number;
  manifestIntervalMs: number;
}

export const PROFILES: Record<string, LOTPProfile> = {
  reliable: {
    id: 'reliable',
    name: 'Reliable QR',
    description: 'Low-density QR at 10 FPS. Best for weak cameras or long distance.',
    gridRows: 24,
    gridCols: 24,
    paletteMode: PaletteMode.MONO_1BIT,
    targetFPS: 10,
    rsEccBytes: 4,
    tilesCount: 1,
    fountainBlockSize: 500,
    manifestIntervalMs: 1500,
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced QR',
    description: 'Fast QR at 15 FPS. Recommended for most phones.',
    gridRows: 24,
    gridCols: 24,
    paletteMode: PaletteMode.GRAY_2BIT,
    targetFPS: 15,
    rsEccBytes: 6,
    tilesCount: 1,
    fountainBlockSize: 1000,
    manifestIntervalMs: 2000,
  },
  fast: {
    id: 'fast',
    name: 'Fast QR',
    description: 'Dense QR at 24 FPS. For close range and bright screens.',
    gridRows: 32,
    gridCols: 32,
    paletteMode: PaletteMode.GRAY_2BIT,
    targetFPS: 24,
    rsEccBytes: 6,
    tilesCount: 1,
    fountainBlockSize: 1465,
    manifestIntervalMs: 2500,
  },
  turbo: {
    id: 'turbo',
    name: 'Turbo QR',
    description: 'Maximum density at 30 FPS. Best-case experimental mode.',
    gridRows: 40,
    gridCols: 40,
    paletteMode: PaletteMode.GRAY_2BIT,
    targetFPS: 30,
    rsEccBytes: 4,
    tilesCount: 1,
    fountainBlockSize: 2331,
    manifestIntervalMs: 3000,
  },
};
