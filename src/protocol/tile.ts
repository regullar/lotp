import { crc32c } from './crc32c';
import { rsInstance } from './ecc/reedsolomon';

export interface DataTile {
  tileId: number;
  frameSeq: number;
  symbolId: number;
  payload: Uint8Array;
  crc: number;
}

export class TilePacker {
  public static packTile(
    tileId: number,
    frameSeq: number,
    symbolId: number,
    payload: Uint8Array,
    rsEccBytes: number
  ): Uint8Array {
    const rawLen = 2 + 4 + 4 + payload.length; // tileId(2), frameSeq(4), symbolId(4), payload
    const rawBuf = new Uint8Array(rawLen + 4); // + 4 for CRC32C
    const view = new DataView(rawBuf.buffer);

    view.setUint16(0, tileId, false);
    view.setUint32(2, frameSeq, false);
    view.setUint32(6, symbolId, false);
    rawBuf.set(payload, 10);

    const checksum = crc32c(rawBuf.subarray(0, rawLen));
    view.setUint32(10 + payload.length, checksum, false);

    // Apply Reed-Solomon inner ECC
    if (rsEccBytes > 0) {
      return rsInstance.encode(rawBuf, rsEccBytes);
    }
    return rawBuf;
  }

  public static unpackTile(
    tileData: Uint8Array,
    rsEccBytes: number,
    payloadSize?: number
  ): DataTile | null {
    if (payloadSize !== undefined) {
      const encodedSize = 14 + payloadSize + rsEccBytes;
      if (tileData.length < encodedSize) return null;
      tileData = tileData.subarray(0, encodedSize);
    }

    let rawBuf: Uint8Array | null = tileData;

    if (rsEccBytes > 0) {
      rawBuf = rsInstance.decode(tileData, rsEccBytes);
      if (!rawBuf) return null; // Reed-Solomon decoding failed
    }

    if (rawBuf.length < 14) return null;

    const view = new DataView(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
    const tileId = view.getUint16(0, false);
    const frameSeq = view.getUint32(2, false);
    const symbolId = view.getUint32(6, false);

    const payloadLen = rawBuf.length - 14;
    const payload = rawBuf.subarray(10, 10 + payloadLen);
    const expectedCrc = view.getUint32(10 + payloadLen, false);

    const actualCrc = crc32c(rawBuf.subarray(0, 10 + payloadLen));
    if (actualCrc !== expectedCrc) {
      return null; // CRC mismatch
    }

    return {
      tileId,
      frameSeq,
      symbolId,
      payload,
      crc: actualCrc,
    };
  }
}
