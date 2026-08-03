import { describe, expect, it } from 'vitest';
import { FrameType, PaletteMode } from '../protocol/constants';
import { LTEncoder } from '../protocol/fountain/ltcode';
import { LTPeelingDecoder } from '../protocol/fountain/peeling';
import { ManifestSerializer } from '../protocol/manifest';
import { TilePacker } from '../protocol/tile';
import { LOTPContainer } from '../protocol/container/lotpContainer';
import { FrameBuilder } from '../protocol/frame';
import { decodeQRFrame, encodeQRFrame } from '../protocol/qrFrame';

describe('receiver recovery pipeline', () => {
  it('round-trips a complete LOTP frame through the QR text envelope', () => {
    const payload = Uint8Array.from({ length: 16 }, (_, index) => index * 7);
    const headerBytes = FrameBuilder.packHeader(FrameType.DATA, 42, 1, PaletteMode.MONO_1BIT);
    const tileBytes = TilePacker.packTile(0, 42, 3, payload, 4);
    const decodedBytes = decodeQRFrame(encodeQRFrame(headerBytes, tileBytes))!;

    expect(FrameBuilder.unpackHeader(decodedBytes.subarray(0, 11))?.frameSeq).toBe(42);
    expect(TilePacker.unpackTile(decodedBytes.subarray(11), 4, payload.length)?.payload).toEqual(payload);
    expect(decodeQRFrame('https://example.com')).toBeNull();
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
