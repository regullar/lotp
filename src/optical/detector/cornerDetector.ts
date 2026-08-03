import type { Point2D } from '../perspective/homography';

export interface Quadrilateral {
  tl: Point2D;
  tr: Point2D;
  br: Point2D;
  bl: Point2D;
  confidence: number;
}

export class CornerDetector {
  public static detectQuad(imageData: ImageData): Quadrilateral | null {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const gray = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      gray[i] = (r * 77 + g * 150 + b * 29) >> 8;
    }

    let minX = width, maxX = 0, minY = height, maxY = 0;
    const step = 4;
    let count = 0;

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

    if (count < 15 || maxX - minX < 50 || maxY - minY < 50) {
      return null;
    }

    return {
      tl: { x: minX, y: minY },
      tr: { x: maxX, y: minY },
      br: { x: maxX, y: maxY },
      bl: { x: minX, y: maxY },
      confidence: Math.min(1.0, count / 150),
    };
  }
}
