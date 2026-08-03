import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSync as initFastQR } from '@raptorqr/fast-qr-wasm';
import { initSync as initRaptorQ } from '@raptorqr/raptorq-wasm';
import { decodeQRCodesFromCanvas } from '@raptorqr/core/qr/qr_decode';
import { renderQRCodeImageData } from '@raptorqr/core/qr/qr_encoder_browser';
import {
  createRaptorDecoder,
  createRaptorTransfer,
  DEFAULT_RAPTOR_SETTINGS,
  parseRaptorFrame,
  RAPTOR_ECC_LEVEL,
} from '../protocol/raptorTransport';

class TestImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

Object.assign(globalThis, { ImageData: TestImageData });

beforeAll(() => {
  initRaptorQ({ module: readFileSync(new URL('../../node_modules/@raptorqr/raptorq-wasm/src/wasm/raptorqr_raptorq_wasm_bg.wasm', import.meta.url)) });
  initFastQR({ module: readFileSync(new URL('../../node_modules/@raptorqr/fast-qr-wasm/src/wasm/raptorqr_fast_qr_wasm_bg.wasm', import.meta.url)) });
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('zxing_reader.wasm')) {
      const wasm = readFileSync(new URL('../../node_modules/@raptorqr/core/node_modules/zxing-wasm/dist/reader/zxing_reader.wasm', import.meta.url));
      return Promise.resolve(new Response(wasm, { headers: { 'Content-Type': 'application/wasm' } }));
    }
    return nativeFetch(input, init);
  }) as typeof fetch;
});

describe('Raptor Fast recovery', () => {
  it('recovers exact bytes after packet loss and shuffled arrival', async () => {
    const source = Uint8Array.from({ length: 100_000 }, (_, index) => (index * 29 + 11) & 0xff);
    const transfer = await createRaptorTransfer(source, 77);
    const received = transfer.packets.filter((_, index) => index % 8 !== 0).reverse();
    const first = parseRaptorFrame(received[0])!;
    const decoder = await createRaptorDecoder(first);
    let restored: Uint8Array | null = null;

    for (const bytes of received) {
      const frame = parseRaptorFrame(bytes)!;
      restored = decoder.push(frame.packet.payload) ?? restored;
      if (restored) break;
    }

    expect(restored).toEqual(source);
  });

  it('renders and decodes both reliable and fast layouts', async () => {
    const source = Uint8Array.from({ length: 20_000 }, (_, index) => (index * 37) & 0xff);
    const modes = [DEFAULT_RAPTOR_SETTINGS, { ...DEFAULT_RAPTOR_SETTINGS, parallel: 4 as const }];

    for (const settings of modes) {
      const transfer = await createRaptorTransfer(source, 1234, settings);
      const packets = transfer.packets.slice(0, settings.parallel);
      const grid = settings.parallel === 1 ? 1 : 2;
      const scale = Math.max(2, Math.ceil(580 / grid / (17 + settings.version * 4 + 8)));
      const tiles = await Promise.all(packets.map((packet) =>
        renderQRCodeImageData(packet, settings.version, RAPTOR_ECC_LEVEL, scale)
      ));
      const tileSide = tiles[0].width;
      const side = tileSide * grid;
      const pixels = new Uint8ClampedArray(side * side * 4);
      tiles.forEach((tile, index) => {
        const x = index % grid * tileSide;
        const y = Math.floor(index / grid) * tileSide;
        for (let row = 0; row < tileSide; row++) {
          pixels.set(
            tile.data.subarray(row * tileSide * 4, (row + 1) * tileSide * 4),
            ((y + row) * side + x) * 4,
          );
        }
      });

      const decoded = await decodeQRCodesFromCanvas(
        new TestImageData(pixels, side, side) as ImageData,
        { maxSymbols: 4, tryDownscale: false },
      );
      const expected = packets.map((packet) => Array.from(packet)).sort();
      const actual = decoded.map((result) => Array.from(result.bytes)).sort();
      expect(actual).toEqual(expected);
    }
  });

  it('decodes all 4 QR codes from sub-quadrants when 2x2 matrix is scanned', async () => {
    const source = Uint8Array.from({ length: 15_000 }, (_, index) => (index * 41) & 0xff);
    const settings = { ...DEFAULT_RAPTOR_SETTINGS, parallel: 4 as const };
    const transfer = await createRaptorTransfer(source, 5678, settings);
    const packets = transfer.packets.slice(0, 4);
    const grid = 2;
    const scale = Math.max(2, Math.ceil(580 / grid / (17 + settings.version * 4 + 8)));
    const tiles = await Promise.all(packets.map((packet) =>
      renderQRCodeImageData(packet, settings.version, RAPTOR_ECC_LEVEL, scale)
    ));
    const tileSide = tiles[0].width;
    const side = tileSide * grid;
    const pixels = new Uint8ClampedArray(side * side * 4);
    tiles.forEach((tile, index) => {
      const x = (index % grid) * tileSide;
      const y = Math.floor(index / grid) * tileSide;
      for (let row = 0; row < tileSide; row++) {
        pixels.set(
          tile.data.subarray(row * tileSide * 4, (row + 1) * tileSide * 4),
          ((y + row) * side + x) * 4,
        );
      }
    });

    const hw = Math.floor(side * 0.55);
    const hh = Math.floor(side * 0.55);
    const x1 = side - hw;
    const y1 = side - hh;

    const quads = [
      { sx: 0, sy: 0 },
      { sx: x1, sy: 0 },
      { sx: 0, sy: y1 },
      { sx: x1, sy: y1 },
    ];

    const src32 = new Uint32Array(pixels.buffer);
    const decodedFrames: Uint8Array[] = [];

    for (const q of quads) {
      const qPixels = new Uint8ClampedArray(hw * hh * 4);
      const dst32 = new Uint32Array(qPixels.buffer);
      for (let row = 0; row < hh; row++) {
        const srcOffset = (q.sy + row) * side + q.sx;
        dst32.set(src32.subarray(srcOffset, srcOffset + hw), row * hw);
      }
      const res = await decodeQRCodesFromCanvas(
        new TestImageData(qPixels, hw, hh) as ImageData,
        { maxSymbols: 1, tryHarder: true, tryRotate: true, tryDownscale: false }
      );
      if (res.length > 0) {
        decodedFrames.push(res[0].bytes);
      }
    }

    expect(decodedFrames.length).toBe(4);
    const actual = decodedFrames.map((f) => Array.from(f)).sort();
    const expected = packets.map((p) => Array.from(p)).sort();
    expect(actual).toEqual(expected);
  });
});
