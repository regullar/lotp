import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import { PaletteMode, PROFILES } from '../protocol/constants';
import { LTDecoder, LTEncoder } from '../protocol/fountain/fountain';
import { ManifestSerializer } from '../protocol/manifest';
import { LOTPContainer } from '../protocol/container/lotpContainer';
import {
  fnv1a,
  packTransportFrame,
  parseTransportFrame,
  transportIdentity,
} from '../protocol/transportFrame';

describe('receiver recovery pipeline', () => {
  it('decodes the exact raw QR bytes from the fastest profiles with ZXing WASM', async () => {
    prepareZXingModule({
      overrides: {
        wasmBinary: readFileSync(new URL('../../node_modules/zxing-wasm/dist/reader/zxing_reader.wasm', import.meta.url)),
      },
    });

    for (const profile of [PROFILES.fast, PROFILES.turbo]) {
      const frame = Uint8Array.from({ length: profile.fountainBlockSize + 20 }, (_, index) => (index * 37) & 0xff);
      const segment = { data: frame, mode: 'byte' } as unknown as QRCode.QRCodeSegment;
      const png = await QRCode.toBuffer([segment], {
        errorCorrectionLevel: 'L',
        margin: 4,
        width: 512,
      });
      const decoded = await readBarcodes(png, { formats: ['QRCode'], maxNumberOfSymbols: 1 });

      expect(decoded[0]?.isValid).toBe(true);
      expect(decoded[0]?.bytes).toEqual(frame);
    }
  });

  it('recovers a real container from self-describing QR frames in any order', async () => {
    const fileData = Uint8Array.from({ length: 1537 }, (_, index) => (index * 29 + 11) & 0xff);
    const file = new File([fileData], 'test.bin', {
      type: 'application/octet-stream',
      lastModified: 1234,
    });
    const container = await LOTPContainer.pack([{ file, data: fileData }]);
    const blockSize = 128;
    const manifest = await ManifestSerializer.create(
      '77',
      [{ file, data: fileData }],
      container,
      blockSize,
      'reliable',
      PaletteMode.MONO_1BIT,
    );
    const manifestBytes = ManifestSerializer.encode(manifest);
    const transport = new Uint8Array(manifestBytes.length + container.length);
    transport.set(manifestBytes);
    transport.set(container, manifestBytes.length);

    const encoder = new LTEncoder(transport, blockSize, 77);
    const hash = fnv1a(transport);
    const captured: Uint8Array[] = [];
    for (let sequence = 23; sequence < 23 + encoder.blockCount * 8; sequence++) {
      if (sequence % 5 === 1) continue;
      captured.push(packTransportFrame({
        sessionId: 77,
        sequence,
        blockCount: encoder.blockCount,
        blockSize,
        totalSize: transport.length,
        payloadHash: hash,
      }, encoder.encode(sequence)));
    }

    let decoder: LTDecoder | null = null;
    let identity = '';
    for (const encodedFrame of captured.reverse()) {
      const parsed = parseTransportFrame(encodedFrame)!;
      const nextIdentity = transportIdentity(parsed.header);
      if (!decoder || identity !== nextIdentity) {
        decoder = new LTDecoder(
          parsed.header.blockCount,
          parsed.header.blockSize,
          parsed.header.sessionId,
          parsed.header.totalSize,
        );
        identity = nextIdentity;
      }
      decoder.addFrame(parsed.header.sequence, parsed.block);
      if (decoder.isComplete) break;
    }

    expect(decoder?.isComplete).toBe(true);
    const restoredTransport = decoder!.reconstruct()!;
    expect(fnv1a(restoredTransport)).toBe(hash);
    const restoredManifest = ManifestSerializer.decode(restoredTransport)!;
    const restoredFiles = await LOTPContainer.unpack(restoredTransport.subarray(16));
    expect(restoredManifest.totalSize).toBe(container.length);
    expect(restoredFiles[0].name).toBe('test.bin');
    expect(restoredFiles[0].data).toEqual(fileData);
  });

  it('rejects unrelated or truncated QR payloads', () => {
    expect(parseTransportFrame(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
