import { PaletteMode } from '../../protocol/constants';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface CalibrationPalette {
  blackLuma: number;
  whiteLuma: number;
  grayLevels: number[]; // Sorted luma thresholds
  colorSamples: Record<number, RGB>;
}

export class PaletteCalibrator {
  public static calibrate(
    imageData: ImageData,
    paletteMode: PaletteMode
  ): CalibrationPalette {
    // Default fallback values
    let blackLuma = 20;
    let whiteLuma = 235;

    if (paletteMode === PaletteMode.MONO_1BIT) {
      return {
        blackLuma: 40,
        whiteLuma: 215,
        grayLevels: [128],
        colorSamples: {},
      };
    }

    if (paletteMode === PaletteMode.GRAY_2BIT) {
      // 4 levels: 00 (Black), 01 (Dark Gray), 10 (Light Gray), 11 (White)
      const range = whiteLuma - blackLuma;
      const t1 = blackLuma + range * 0.25;
      const t2 = blackLuma + range * 0.50;
      const t3 = blackLuma + range * 0.75;
      return {
        blackLuma,
        whiteLuma,
        grayLevels: [t1, t2, t3],
        colorSamples: {},
      };
    }

    // Color mode
    return {
      blackLuma: 30,
      whiteLuma: 220,
      grayLevels: [128],
      colorSamples: {
        0: { r: 0, g: 0, b: 0 },       // Black
        1: { r: 255, g: 0, b: 0 },     // Red
        2: { r: 0, g: 255, b: 0 },     // Green
        3: { r: 0, g: 0, b: 255 },     // Blue
        4: { r: 255, g: 255, b: 255 }, // White
      },
    };
  }
}
