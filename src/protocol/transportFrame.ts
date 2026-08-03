// Adapted from decimen-optical-transfer (MIT, Copyright 2026 BashAlarmist).
// Every QR frame describes the stream, so scanning can begin at any moment.

const MAGIC_0 = 0xd1;
const MAGIC_1 = 0x0c;
export const TRANSPORT_HEADER_SIZE = 20;
export const MAX_TRANSPORT_SIZE = 64 * 1024 * 1024;

export interface TransportHeader {
  sessionId: number;
  sequence: number;
  blockCount: number;
  blockSize: number;
  totalSize: number;
  payloadHash: number;
}

export function packTransportFrame(header: TransportHeader, block: Uint8Array): Uint8Array {
  const output = new Uint8Array(TRANSPORT_HEADER_SIZE + block.length);
  const view = new DataView(output.buffer);
  view.setUint8(0, MAGIC_0);
  view.setUint8(1, MAGIC_1);
  view.setUint16(2, header.sessionId, true);
  view.setUint32(4, header.sequence, true);
  view.setUint16(8, header.blockCount, true);
  view.setUint16(10, header.blockSize, true);
  view.setUint32(12, header.totalSize, true);
  view.setUint32(16, header.payloadHash, true);
  output.set(block, TRANSPORT_HEADER_SIZE);
  return output;
}

export function parseTransportFrame(
  bytes: Uint8Array,
): { header: TransportHeader; block: Uint8Array } | null {
  if (bytes.length <= TRANSPORT_HEADER_SIZE || bytes[0] !== MAGIC_0 || bytes[1] !== MAGIC_1) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header: TransportHeader = {
    sessionId: view.getUint16(2, true),
    sequence: view.getUint32(4, true),
    blockCount: view.getUint16(8, true),
    blockSize: view.getUint16(10, true),
    totalSize: view.getUint32(12, true),
    payloadHash: view.getUint32(16, true),
  };
  if (
    header.sessionId === 0 ||
    header.blockCount === 0 ||
    header.blockSize === 0 ||
    header.blockSize > 4096 ||
    header.totalSize === 0 ||
    header.totalSize > MAX_TRANSPORT_SIZE ||
    header.blockCount !== Math.ceil(header.totalSize / header.blockSize) ||
    bytes.length !== TRANSPORT_HEADER_SIZE + header.blockSize
  ) {
    return null;
  }
  return { header, block: bytes.subarray(TRANSPORT_HEADER_SIZE) };
}

export function transportIdentity(header: TransportHeader): string {
  return [
    header.sessionId,
    header.blockCount,
    header.blockSize,
    header.totalSize,
    header.payloadHash,
  ].join(':');
}

export function fnv1a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
