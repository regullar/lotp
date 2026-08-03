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
