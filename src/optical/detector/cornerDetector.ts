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

    // ponytail: fixed guide is reliable front-on; add fiducial search only when off-axis scanning is required.
    const size = Math.floor(Math.min(width, height) * 0.7);
    const minX = Math.floor((width - size) / 2);
    const minY = Math.floor((height - size) / 2);
    const maxX = minX + size;
    const maxY = minY + size;
    const step = 4;
    let count = 0;
    let samples = 0;

    for (let y = minY + step; y < maxY; y += step) {
      for (let x = minX + step; x < maxX; x += step) {
        const idx = y * width + x;
        const val = gray[idx];
        if (Math.abs(val - gray[idx - step]) > 40) count++;
        if (Math.abs(val - gray[idx - step * width]) > 40) count++;
        samples += 2;
      }
    }

    const edgeRatio = count / samples;
    if (edgeRatio < 0.04) return null;

    return {
      tl: { x: minX, y: minY },
      tr: { x: maxX, y: minY },
      br: { x: maxX, y: maxY },
      bl: { x: minX, y: maxY },
      confidence: Math.min(1, edgeRatio / 0.2),
    };
  }
}
