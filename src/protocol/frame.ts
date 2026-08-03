import { FrameType, PaletteMode } from './constants';
import { crc32c } from './crc32c';

export interface FrameHeader {
  frameType: FrameType;
  frameSeq: number;
  tilesCount: number;
  paletteMode: PaletteMode;
  headerCrc: number;
}

export class FrameBuilder {
  /**
   * Header format:
   * [1B FrameType][4B FrameSeq][1B TilesCount][1B PaletteMode][4B Header CRC32C]
   */
  public static packHeader(
    frameType: FrameType,
    frameSeq: number,
    tilesCount: number,
    paletteMode: PaletteMode
  ): Uint8Array {
    const buf = new Uint8Array(11);
    const view = new DataView(buf.buffer);
    buf[0] = frameType;
    view.setUint32(1, frameSeq, false);
    buf[5] = tilesCount;
    buf[6] = paletteMode;

    const checksum = crc32c(buf.subarray(0, 7));
    view.setUint32(7, checksum, false);
    return buf;
  }

  public static unpackHeader(data: Uint8Array): FrameHeader | null {
    if (data.length < 11) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const frameType = data[0] as FrameType;
    const frameSeq = view.getUint32(1, false);
    const tilesCount = data[5];
    const paletteMode = data[6] as PaletteMode;
    const expectedCrc = view.getUint32(7, false);

    const actualCrc = crc32c(data.subarray(0, 7));
    if (actualCrc !== expectedCrc) return null;

    return {
      frameType,
      frameSeq,
      tilesCount,
      paletteMode,
      headerCrc: actualCrc,
    };
  }
}
