import { RaptorQWasmDecoder } from '@raptorqr/core/fec/raptorq_wasm';
import { parsePacket, packetCodec, type Packet } from '@raptorqr/core/protocol/packet';
import { createQRTransferProfile } from '@raptorqr/core/protocol/profiles';
import { packetizeRaptorQ } from '@raptorqr/core/sender/raptorq_packetizer';
import { createRaptorQPlaybackOrders } from '@raptorqr/core/sender/raptorq_playback';

export const RAPTOR_MODE = {
  version: 30,
  eccLevel: 'L' as const,
  fps: 30,
  parallel: 4,
  repairPercent: 20,
  scale: 2,
};

const SESSION_HEADER_SIZE = 6;
const SESSION_MAGIC = 0x524c; // "LR" in little-endian.
const qrProfile = createQRTransferProfile(RAPTOR_MODE.version, RAPTOR_MODE.eccLevel);

export const RAPTOR_SYMBOL_SIZE = qrProfile.maxPayloadSize - SESSION_HEADER_SIZE;
export const RAPTOR_SOURCE_BYTES = RAPTOR_SYMBOL_SIZE - 4;
export const RAPTOR_MAX_TRANSFER_SIZE = 0xffffff;

export interface RaptorFrame {
  sessionId: number;
  packet: Packet;
}

export async function createRaptorTransfer(data: Uint8Array, sessionId: number) {
  if (data.length > RAPTOR_MAX_TRANSFER_SIZE) {
    throw new Error('Передача больше 16 МБ пока не поддерживается.');
  }

  const encoded = await packetizeRaptorQ(data, false, false, undefined, undefined, {
    maxTransportPayloadSize: RAPTOR_SYMBOL_SIZE,
    repairPercent: RAPTOR_MODE.repairPercent,
  });
  const orders = createRaptorQPlaybackOrders(
    encoded.sourcePacketIndices,
    encoded.repairPacketIndices,
    'balanced',
  );

  return {
    packets: encoded.packets.map((packet) => wrapRaptorPacket(sessionId, packet)),
    initialOrder: orders.initialOrder,
    loopOrder: orders.loopOrder,
    sourcePackets: encoded.sourceGenerations,
  };
}

export function parseRaptorFrame(bytes: Uint8Array): RaptorFrame | null {
  if (bytes.length < SESSION_HEADER_SIZE + 12) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(0, true) !== SESSION_MAGIC) return null;

  try {
    const packet = parsePacket(bytes.subarray(SESSION_HEADER_SIZE));
    if (packetCodec(packet.header) !== 'wasm-raptorq' || packet.header.compressed) return null;
    return { sessionId: view.getUint32(2, true), packet };
  } catch {
    return null;
  }
}

export function raptorFrameIdentity(frame: RaptorFrame): string {
  return `${frame.sessionId}:${frame.packet.header.dataLength}:${frame.packet.payload.length}`;
}

export function raptorPacketIdentity(packet: Packet): number {
  return new DataView(packet.payload.buffer, packet.payload.byteOffset, packet.payload.byteLength)
    .getUint32(0, false);
}

export function createRaptorDecoder(frame: RaptorFrame): Promise<RaptorQWasmDecoder> {
  return RaptorQWasmDecoder.create(frame.packet.header.dataLength, frame.packet.payload.length);
}

function wrapRaptorPacket(sessionId: number, packet: Uint8Array): Uint8Array {
  if (!Number.isInteger(sessionId) || sessionId <= 0) throw new Error('Некорректный идентификатор передачи.');
  if (packet.length + SESSION_HEADER_SIZE > qrProfile.maxPacketSize) throw new Error('QR-пакет переполнен.');
  const frame = new Uint8Array(SESSION_HEADER_SIZE + packet.length);
  const view = new DataView(frame.buffer);
  view.setUint16(0, SESSION_MAGIC, true);
  view.setUint32(2, sessionId, true);
  frame.set(packet, SESSION_HEADER_SIZE);
  return frame;
}
