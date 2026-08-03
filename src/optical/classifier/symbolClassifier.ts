import { PaletteMode } from '../../protocol/constants';
import { CalibrationPalette } from '../calibration/paletteCalibrator';
import { SampledCell } from '../sampler/cellSampler';

export class SymbolClassifier {
  public static classifyBits(
    cell: SampledCell,
    paletteMode: PaletteMode,
    calibration: CalibrationPalette
  ): number | null {
    if (cell.isErasure) return null;

    if (paletteMode === PaletteMode.MONO_1BIT) {
      const mid = (calibration.blackLuma + calibration.whiteLuma) / 2;
      return cell.luma > mid ? 1 : 0;
    }

    if (paletteMode === PaletteMode.GRAY_2BIT) {
      const [t1, t2, t3] = calibration.grayLevels;
      if (cell.luma < t1) return 0;       // 00
      if (cell.luma < t2) return 1;       // 01
      if (cell.luma < t3) return 2;       // 10
      return 3;                           // 11
    }

    // Color mode: 4 colors (00: Black, 01: Red, 10: Green, 11: Blue)
    let minDist = Infinity;
    let bestSymbol = 0;

    for (const [symStr, rgb] of Object.entries(calibration.colorSamples)) {
      const sym = Number(symStr);
      const dr = cell.r - rgb.r;
      const dg = cell.g - rgb.g;
      const db = cell.b - rgb.b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) {
        minDist = dist;
        bestSymbol = sym;
      }
    }

    return bestSymbol;
  }
}
