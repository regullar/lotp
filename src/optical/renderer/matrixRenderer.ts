import { PaletteMode } from '../../protocol/constants';

export interface RenderMatrixOptions {
  canvas: HTMLCanvasElement;
  rows: number;
  cols: number;
  paletteMode: PaletteMode;
  headerData: Uint8Array;
  tilesData: Uint8Array[];
}

export class MatrixRenderer {
  public static renderFrame(options: RenderMatrixOptions): void {
    const { canvas, rows, cols, paletteMode, headerData, tilesData } = options;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background to white quiet zone
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const cellWidth = width / cols;
    const cellHeight = height / rows;

    const drawCell = (r: number, c: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
    };

    // 1. Outer Border & Quiet Zone
    for (let c = 0; c < cols; c++) {
      drawCell(0, c, c % 2 === 0 ? '#000000' : '#FFFFFF'); // Timing top
      drawCell(rows - 1, c, c % 2 === 0 ? '#000000' : '#FFFFFF'); // Timing bottom
    }
    for (let r = 0; r < rows; r++) {
      drawCell(r, 0, r % 2 === 0 ? '#000000' : '#FFFFFF'); // Timing left
      drawCell(r, cols - 1, r % 2 === 0 ? '#000000' : '#FFFFFF'); // Timing right
    }

    // 2. 4 Asymmetric Corner Fiducial Markers (3x3 blocks in corners)
    // Top-Left (TL): Solid black outer with white center
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        drawCell(1 + dr, 1 + dc, (dr === 1 && dc === 1) ? '#FFFFFF' : '#000000');
      }
    }
    // Top-Right (TR): Solid black outer
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        drawCell(1 + dr, cols - 4 + dc, '#000000');
      }
    }
    // Bottom-Left (BL): Alternating grid
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        drawCell(rows - 4 + dr, 1 + dc, (dr + dc) % 2 === 0 ? '#000000' : '#FFFFFF');
      }
    }
    // Bottom-Right (BR): Diagonal cross
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        drawCell(rows - 4 + dr, cols - 4 + dc, (dr === dc) ? '#000000' : '#FFFFFF');
      }
    }

    // 3. Calibration Palette Strip (Row 1, between markers)
    const calibrationColors = paletteMode === PaletteMode.MONO_1BIT
      ? ['#000000', '#FFFFFF']
      : paletteMode === PaletteMode.GRAY_2BIT
      ? ['#000000', '#555555', '#AAAAAA', '#FFFFFF']
      : ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFFFF'];

    for (let c = 4; c < cols - 4; c++) {
      const colorIdx = (c - 4) % calibrationColors.length;
      drawCell(1, c, calibrationColors[colorIdx]);
    }

    // 4. Render Data Tiles and Header in interior cells
    let tileByteIdx = 0;
    const allBytes: number[] = [];
    headerData.forEach((b) => allBytes.push(b));
    tilesData.forEach((td) => td.forEach((b) => allBytes.push(b)));

    let bitBuf = 0;
    let bitsInBuf = 0;
    let bytePtr = 0;

    const getBits = (count: number): number => {
      while (bitsInBuf < count && bytePtr < allBytes.length) {
        bitBuf = (bitBuf << 8) | allBytes[bytePtr++];
        bitsInBuf += 8;
      }
      if (bitsInBuf < count) return 0;
      const shift = bitsInBuf - count;
      const val = (bitBuf >>> shift) & ((1 << count) - 1);
      bitsInBuf -= count;
      return val;
    };

    const bitsPerCell = paletteMode === PaletteMode.MONO_1BIT ? 1 : 2;

    for (let r = 2; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        // Skip corner fiducial areas
        if ((r <= 3 && c <= 3) || (r <= 3 && c >= cols - 4) || (r >= rows - 4 && c <= 3) || (r >= rows - 4 && c >= cols - 4)) {
          continue;
        }

        const symbolVal = getBits(bitsPerCell);
        let cellColor = '#FFFFFF';

        if (paletteMode === PaletteMode.MONO_1BIT) {
          cellColor = symbolVal === 1 ? '#FFFFFF' : '#000000';
        } else if (paletteMode === PaletteMode.GRAY_2BIT) {
          const grayMap = ['#000000', '#555555', '#AAAAAA', '#FFFFFF'];
          cellColor = grayMap[symbolVal] || '#FFFFFF';
        } else {
          const colorMap = ['#000000', '#FF0000', '#00FF00', '#0000FF'];
          cellColor = colorMap[symbolVal] || '#FFFFFF';
        }

        drawCell(r, c, cellColor);
      }
    }
  }
}
