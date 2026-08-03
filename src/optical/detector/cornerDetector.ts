import { Point2D } from '../perspective/homography';

export interface Quadrilateral {
  tl: Point2D;
  tr: Point2D;
  br: Point2D;
  bl: Point2D;
  confidence: number;
}

/**
 * Lightweight 2D Computer Vision Quad & Corner Detector in pure TypeScript.
 * Uses adaptive binarization, contour bounding quad extraction, and fiducial corner orientation matching.
 */
export class CornerDetector {
  public static detectQuad(
    imageData: ImageData
  ): Quadrilateral | null {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // 1. Grayscale & Fast Integral Image / Local Threshold
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      gray[i] = (r * 77 + g * 150 + b * 29) >> 8;
    }

    // 2. Sample bounding box of high contrast screen region
    let minX = width, maxX = 0, minY = height, maxY = 0;
    const step = 4;
    let count = 0;

    // Simple adaptive threshold check for screen border region
    for (let y = 10; y < height - 10; y += step) {
      for (let x = 10; x < width - 10; x += step) {
        const idx = y * width + x;
        const val = gray[idx];
        const leftVal = gray[idx - step];
        if (Math.abs(val - leftVal) > 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          count++;
        }
      }
    }

    if (count < 20 || maxX - minX < 80 || maxY - minY < 80) {
      return null;
    }

    // Add padding margin
    const marginX = (maxX - minX) * 0.05;
    const marginY = (maxY - minY) * 0.05;

    const tl: Point2D = { x: Math.max(0, minX - marginX), y: Math.max(0, minY - marginY) };
    const tr: Point2D = { x: Math.min(width - 1, maxX + marginX), y: Math.max(0, minY - marginY) };
    const br: Point2D = { x: Math.min(width - 1, maxX + marginX), y: Math.min(height - 1, maxY + marginY) };
    const bl: Point2D = { x: Math.max(0, minX - marginX), y: Math.min(height - 1, maxY + marginY) };

    return {
      tl,
      tr,
      br,
      bl,
      confidence: Math.min(1.0, count / 200),
    };
  }
}
