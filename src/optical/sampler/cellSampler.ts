import { Homography, Point2D } from '../perspective/homography';
import { CalibrationPalette } from '../calibration/paletteCalibrator';
import { PaletteMode } from '../../protocol/constants';

export interface SampledCell {
  row: number;
  col: number;
  luma: number;
  r: number;
  g: number;
  b: number;
  isErasure: boolean;
}

export class CellSampler {
  public static sampleGrid(
    imageData: ImageData,
    homographyH: number[],
    rows: number,
    cols: number,
    paletteMode: PaletteMode,
    calibration: CalibrationPalette
  ): SampledCell[][] {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const grid: SampledCell[][] = [];

    for (let r = 0; r < rows; r++) {
      const rowCells: SampledCell[] = [];
      for (let c = 0; c < cols; c++) {
        // Grid normalized cell center (0..1, 0..1)
        const normX = (c + 0.5) / cols;
        const normY = (r + 0.5) / rows;

        // Sample 5 inner points around cell center
        const offsets = [
          { dx: 0, dy: 0 },
          { dx: -0.15, dy: -0.15 },
          { dx: 0.15, dy: -0.15 },
          { dx: -0.15, dy: 0.15 },
          { dx: 0.15, dy: 0.15 },
        ];

        let sumR = 0, sumG = 0, sumB = 0, sumLuma = 0;
        let validPoints = 0;
        const lumas: number[] = [];

        for (const { dx, dy } of offsets) {
          const pt = Homography.transformPoint(
            { x: normX + dx / cols, y: normY + dy / rows },
            homographyH
          );

          const px = Math.round(pt.x);
          const py = Math.round(pt.y);

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            const cr = data[idx];
            const cg = data[idx + 1];
            const cb = data[idx + 2];
            const cluma = (cr * 77 + cg * 150 + cb * 29) >> 8;

            sumR += cr;
            sumG += cg;
            sumB += cb;
            sumLuma += cluma;
            lumas.push(cluma);
            validPoints++;
          }
        }

        if (validPoints === 0) {
          rowCells.push({ row: r, col: c, luma: 128, r: 128, g: 128, b: 128, isErasure: true });
          continue;
        }

        const avgR = sumR / validPoints;
        const avgG = sumG / validPoints;
        const avgB = sumB / validPoints;
        const avgLuma = sumLuma / validPoints;

        // Variance check for erasure detection
        const variance = lumas.reduce((acc, l) => acc + Math.pow(l - avgLuma, 2), 0) / validPoints;
        const isErasure = variance > 1200; // High internal variance means glare or edge blur

        rowCells.push({
          row: r,
          col: c,
          luma: avgLuma,
          r: avgR,
          g: avgG,
          b: avgB,
          isErasure,
        });
      }
      grid.push(rowCells);
    }

    return grid;
  }
}
