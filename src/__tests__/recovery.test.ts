import { describe, expect, it } from 'vitest';
import { FrameType, PaletteMode } from '../protocol/constants';
import { LTEncoder } from '../protocol/fountain/ltcode';
import { LTPeelingDecoder } from '../protocol/fountain/peeling';
import { ManifestSerializer } from '../protocol/manifest';
import { TilePacker } from '../protocol/tile';
import { LOTPContainer } from '../protocol/container/lotpContainer';
import { Homography } from '../optical/perspective/homography';
import { CornerDetector } from '../optical/detector/cornerDetector';
import { FrameBuilder } from '../protocol/frame';
import { PaletteCalibrator } from '../optical/calibration/paletteCalibrator';
import { CellSampler } from '../optical/sampler/cellSampler';
import { SymbolClassifier } from '../optical/classifier/symbolClassifier';

describe('receiver recovery pipeline', () => {
  it('keeps the scan quad square when the background has wide edges', () => {
    const width = 640;
    const height = 480;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    const paint = (left: number, top: number, right: number, bottom: number, value: number) => {
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const offset = (y * width + x) * 4;
          pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
        }
      }
    };

    paint(20, 220, 620, 232, 0);
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 24; col++) {
        paint(152 + col * 14, 72 + row * 14, 166 + col * 14, 86 + row * 14, (row + col) % 2 ? 255 : 0);
      }
    }

    const quad = CornerDetector.detectQuad({ width, height, data: pixels } as ImageData)!;
    expect(quad.br.x - quad.bl.x).toBe(336);
    expect(quad.bl.y - quad.tl.y).toBe(336);
  });

  it('maps normalized grid coordinates into camera pixels', () => {
    const transform = Homography.findHomography(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      [{ x: 100, y: 50 }, { x: 500, y: 50 }, { x: 500, y: 350 }, { x: 100, y: 350 }]
    );
    expect(Homography.transformPoint({ x: 0.25, y: 0.5 }, transform!)).toEqual({ x: 200, y: 200 });
  });

  it('decodes a complete optical frame from camera pixels', () => {
    const rows = 24;
    const cols = 24;
    const width = 640;
    const height = 480;
    const payload = Uint8Array.from({ length: 16 }, (_, index) => index * 7);
    const headerBytes = FrameBuilder.packHeader(FrameType.DATA, 42, 1, PaletteMode.MONO_1BIT);
    const tileBytes = TilePacker.packTile(0, 42, 3, payload, 4);
    const frameBytes = Uint8Array.from([...headerBytes, ...tileBytes]);
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    let bitIndex = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isDataCell = row >= 2 && row < rows - 1 && col >= 1 && col < cols - 1
          && !((row <= 3 && col <= 3) || (row <= 3 && col >= cols - 4)
            || (row >= rows - 4 && col <= 3) || (row >= rows - 4 && col >= cols - 4));
        const bit = isDataCell
          ? (frameBytes[Math.floor(bitIndex / 8)] ?? 0) >> (7 - bitIndex++ % 8) & 1
          : (row + col) % 2;
        for (let y = 72 + row * 14; y < 86 + row * 14; y++) {
          for (let x = 152 + col * 14; x < 166 + col * 14; x++) {
            const offset = (y * width + x) * 4;
            pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = bit ? 255 : 0;
          }
        }
      }
    }

    const imageData = { width, height, data: pixels } as ImageData;
    const quad = CornerDetector.detectQuad(imageData)!;
    const transform = Homography.findHomography(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      [quad.tl, quad.tr, quad.br, quad.bl]
    )!;
    const calibration = PaletteCalibrator.calibrate(imageData, PaletteMode.MONO_1BIT);
    const grid = CellSampler.sampleGrid(imageData, transform, rows, cols, PaletteMode.MONO_1BIT, calibration);
    const decodedBits: number[] = [];
    for (let row = 2; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        if ((row <= 3 && col <= 3) || (row <= 3 && col >= cols - 4)
          || (row >= rows - 4 && col <= 3) || (row >= rows - 4 && col >= cols - 4)) continue;
        decodedBits.push(SymbolClassifier.classifyBits(grid[row][col], PaletteMode.MONO_1BIT, calibration) ?? 0);
      }
    }
    const decodedBytes = new Uint8Array(Math.floor(decodedBits.length / 8));
    for (let index = 0; index < decodedBytes.length; index++) {
      decodedBytes[index] = decodedBits.slice(index * 8, index * 8 + 8).reduce((byte, bit) => byte << 1 | bit, 0);
    }

    expect(FrameBuilder.unpackHeader(decodedBytes.subarray(0, 11))?.frameSeq).toBe(42);
    expect(TilePacker.unpackTile(decodedBytes.subarray(11), 4, payload.length)?.payload).toEqual(payload);
  });

  it('reassembles the manifest and fountain data from padded optical frames', async () => {
    const source = Uint8Array.from({ length: 113 }, (_, index) => (index * 29 + 11) & 0xff);
    const blockSize = 16;
    const rsEccBytes = 4;
    const encoder = new LTEncoder(source, blockSize);
    const fileData = source.subarray(0, 20);
    const manifest = await ManifestSerializer.create(
      'test',
      [{ file: new File([fileData], 'test.bin'), data: fileData }],
      source,
      blockSize,
      'reliable',
      PaletteMode.MONO_1BIT,
      true,
      { saltHex: '01'.repeat(16), noncePrefixHex: '02'.repeat(8) }
    );
    expect(manifest.totalSize).toBe(source.length);

    const manifestPayloads = ManifestSerializer.fragment(ManifestSerializer.encode(manifest), blockSize);
    const receivedFragments = manifestPayloads.map((payload, index) => {
      const tile = TilePacker.packTile(0, index, index, payload, rsEccBytes);
      const paddedFrame = new Uint8Array(tile.length + 9);
      paddedFrame.set(tile);
      return TilePacker.unpackTile(paddedFrame, rsEccBytes, blockSize)!.payload;
    });
    const receivedManifest = ManifestSerializer.decode(ManifestSerializer.assemble(receivedFragments)!);
    expect(receivedManifest?.totalSize).toBe(source.length);
    expect(receivedManifest?.saltHex).toBe('01'.repeat(16));

    const decoder = new LTPeelingDecoder(
      receivedManifest!.totalBlocks,
      receivedManifest!.blockSize,
      receivedManifest!.totalSize
    );

    for (let symbolId = 0; !decoder.isComplete() && symbolId < encoder.getK() * 4; symbolId++) {
      if (symbolId % 7 === 2) continue;
      const symbol = encoder.generateSymbol(symbolId);
      const tile = TilePacker.packTile(0, symbolId, symbolId, symbol.data, rsEccBytes);
      const paddedFrame = new Uint8Array(tile.length + 13);
      paddedFrame.set(tile);
      const received = TilePacker.unpackTile(paddedFrame, rsEccBytes, blockSize)!;
      decoder.addSymbol({
        ...LTEncoder.getSymbolMetadata(received.symbolId, decoder.getTotalBlocks()),
        data: received.payload,
      });
    }

    expect(decoder.isComplete()).toBe(true);
    expect(decoder.reconstruct()).toEqual(source);

    const parent = Uint8Array.from([255, ...source.subarray(0, 20), 254]);
    expect(await LOTPContainer.calcSHA256(parent.subarray(1, -1))).toBe(await LOTPContainer.calcSHA256(fileData));
  });
});
