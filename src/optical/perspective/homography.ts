/**
 * Direct Linear Transform (DLT) 3x3 Homography Matrix Solver and Transformer.
 * Maps 4 source quad points (from camera image) to 4 target rectangular matrix corners.
 */

export interface Point2D {
  x: number;
  y: number;
}

export class Homography {
  /**
   * Solve 3x3 Homography matrix H such that [x', y', 1]^T = H * [x, y, 1]^T
   */
  public static findHomography(src: Point2D[], dst: Point2D[]): number[] | null {
    if (src.length !== 4 || dst.length !== 4) return null;

    // 8x8 system matrix A for Gaussian elimination
    const A: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const { x: sx, y: sy } = src[i];
      const { x: dx, y: dy } = dst[i];
      A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy, dx]);
      A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy, dy]);
    }

    // Solve A * h = 0 via Gaussian Elimination
    for (let i = 0; i < 8; i++) {
      // Find pivot
      let maxRow = i;
      for (let j = i + 1; j < 8; j++) {
        if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
          maxRow = j;
        }
      }

      // Swap rows
      const tmp = A[i];
      A[i] = A[maxRow];
      A[maxRow] = tmp;

      if (Math.abs(A[i][i]) < 1e-10) return null; // Singular

      // Normalize row
      const pivot = A[i][i];
      for (let k = i; k < 9; k++) {
        A[i][k] /= pivot;
      }

      // Eliminate column
      for (let j = 0; j < 8; j++) {
        if (i !== j) {
          const factor = A[j][i];
          for (let k = i; k < 9; k++) {
            A[j][k] -= factor * A[i][k];
          }
        }
      }
    }

    const H = [
      A[0][8], A[1][8], A[2][8],
      A[3][8], A[4][8], A[5][8],
      A[6][8], A[7][8], 1.0,
    ];

    return H;
  }

  /**
   * Project a point (x, y) through 3x3 Homography H.
   */
  public static transformPoint(p: Point2D, H: number[]): Point2D {
    const x = p.x;
    const y = p.y;
    const w = H[6] * x + H[7] * y + H[8];
    return {
      x: (H[0] * x + H[1] * y + H[2]) / w,
      y: (H[3] * x + H[4] * y + H[5]) / w,
    };
  }
}
