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
    name: 'Reliable Mono',
    description: '1-bit B&W, heavy error correction, 20-30 FPS. Best for low-end cameras or long distance.',
    gridRows: 16,
    gridCols: 16,
    paletteMode: PaletteMode.MONO_1BIT,
    targetFPS: 25,
    rsEccBytes: 8,
    tilesCount: 4,
    fountainBlockSize: 64,
    manifestIntervalMs: 1500,
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced Gray',
    description: '2-bit Gray (4 levels), medium ECC, 30-60 FPS. Default recommended setting.',
    gridRows: 24,
    gridCols: 24,
    paletteMode: PaletteMode.GRAY_2BIT,
    targetFPS: 30,
    rsEccBytes: 6,
    tilesCount: 9,
    fountainBlockSize: 128,
    manifestIntervalMs: 2000,
  },
  fast: {
    id: 'fast',
    name: 'Fast Color',
    description: 'Color palette (4/8 colors), high density, 60 FPS display. For high-end cameras.',
    gridRows: 32,
    gridCols: 32,
    paletteMode: PaletteMode.COLOR_2BIT,
    targetFPS: 60,
    rsEccBytes: 4,
    tilesCount: 16,
    fountainBlockSize: 256,
    manifestIntervalMs: 2500,
  },
  turbo: {
    id: 'turbo',
    name: 'Turbo Rolling Shutter',
    description: 'Experimental horizontal band encoding using sensor rolling shutter.',
    gridRows: 40,
    gridCols: 40,
    paletteMode: PaletteMode.GRAY_2BIT,
    targetFPS: 60,
    rsEccBytes: 4,
    tilesCount: 16,
    fountainBlockSize: 256,
    manifestIntervalMs: 3000,
  },
};
