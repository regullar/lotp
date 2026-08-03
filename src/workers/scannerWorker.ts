import { CornerDetector } from '../optical/detector/cornerDetector';
import { Homography } from '../optical/perspective/homography';
import { PaletteCalibrator } from '../optical/calibration/paletteCalibrator';
import { CellSampler } from '../optical/sampler/cellSampler';
import { SymbolClassifier } from '../optical/classifier/symbolClassifier';
import { PaletteMode } from '../protocol/constants';
import { FrameBuilder } from '../protocol/frame';
import { TilePacker } from '../protocol/tile';

self.onmessage = (e: MessageEvent) => {
  const { imageData, rows, cols, paletteMode, rsEccBytes, payloadSize } = e.data;

  try {
    // 1. Detect Screen Bounding Quad
    const quad = CornerDetector.detectQuad(imageData);
    if (!quad || quad.confidence < 0.1) {
      self.postMessage({ type: 'NO_QUAD', confidence: quad ? quad.confidence : 0 });
      return;
    }

    // 2. Homography Perspective Transform
    const srcPts = [quad.tl, quad.tr, quad.br, quad.bl];
    const dstPts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const H = Homography.findHomography(dstPts, srcPts);
    if (!H) {
      self.postMessage({ type: 'HOMOGRAPHY_FAILED' });
      return;
    }

    // 3. Calibration & Cell Sampling
    const calibration = PaletteCalibrator.calibrate(imageData, paletteMode);
    const grid = CellSampler.sampleGrid(imageData, H, rows, cols, paletteMode, calibration);

    // 4. Extract Bits from Grid
    const bits: number[] = [];
    for (let r = 2; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if ((r <= 3 && c <= 3) || (r <= 3 && c >= cols - 4) || (r >= rows - 4 && c <= 3) || (r >= rows - 4 && c >= cols - 4)) {
          continue;
        }
        const cell = grid[r][c];
        const val = SymbolClassifier.classifyBits(cell, paletteMode, calibration);
        if (val === null) {
          bits.push(0); // Erasure default fallback
        } else {
          const bitCount = paletteMode === PaletteMode.MONO_1BIT ? 1 : 2;
          for (let b = bitCount - 1; b >= 0; b--) {
            bits.push((val >> b) & 1);
          }
        }
      }
    }

    // Convert bits to Uint8Array
    const decodedBytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < decodedBytes.length; i++) {
      let b = 0;
      for (let bit = 0; bit < 8; bit++) {
        b = (b << 1) | bits[i * 8 + bit];
      }
      decodedBytes[i] = b;
    }

    // Unpack Frame Header & Tiles
    const header = FrameBuilder.unpackHeader(decodedBytes.subarray(0, 11));
    const tile = TilePacker.unpackTile(decodedBytes.subarray(11), rsEccBytes, payloadSize);
    if (header && tile && header.frameSeq !== tile.frameSeq) {
      self.postMessage({ type: 'FRAME_PROCESSED', quad, header: null, tile: null, confidence: quad.confidence });
      return;
    }

    self.postMessage({
      type: 'FRAME_PROCESSED',
      quad,
      header,
      tile,
      confidence: quad.confidence,
    });
  } catch (err: any) {
    self.postMessage({ type: 'ERROR', error: err?.message || String(err) });
  }
};
