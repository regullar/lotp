import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSync as initFastQR } from '@raptorqr/fast-qr-wasm';
import { initSync as initRaptorQ } from '@raptorqr/raptorq-wasm';
import { decodeQRCodesFromCanvas } from '@raptorqr/core/qr/qr_decode';
import { renderQRCodeImageData } from '@raptorqr/core/qr/qr_encoder_browser';
import {
  createRaptorDecoder,
  createRaptorTransfer,
  parseRaptorFrame,
  RAPTOR_MODE,
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

  it('renders and decodes four binary QR codes from one frame', async () => {
    const source = Uint8Array.from({ length: 20_000 }, (_, index) => (index * 37) & 0xff);
    const transfer = await createRaptorTransfer(source, 1234);
    const packets = transfer.packets.slice(0, 4);
    const tiles = await Promise.all(packets.map((packet) =>
      renderQRCodeImageData(packet, RAPTOR_MODE.version, RAPTOR_MODE.eccLevel, RAPTOR_MODE.scale)
    ));
    const tileSide = tiles[0].width;
    const side = tileSide * 2;
    const pixels = new Uint8ClampedArray(side * side * 4);
    tiles.forEach((tile, index) => {
      const x = index % 2 * tileSide;
      const y = Math.floor(index / 2) * tileSide;
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
  });
});
