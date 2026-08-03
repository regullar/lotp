import { RaptorQWasmDecoder } from '@raptorqr/core/fec/raptorq_wasm';
import { parsePacket, packetCodec, type Packet } from '@raptorqr/core/protocol/packet';
import { createQRTransferProfile } from '@raptorqr/core/protocol/profiles';
import { packetizeRaptorQ } from '@raptorqr/core/sender/raptorq_packetizer';
import { createRaptorQPlaybackOrders } from '@raptorqr/core/sender/raptorq_playback';

export interface RaptorSettings {
  version: number;
  fps: number;
  parallel: 1 | 4;
}

export const DEFAULT_RAPTOR_SETTINGS: RaptorSettings = {
  version: 20,
  fps: 15,
  parallel: 1,
};

export const RAPTOR_ECC_LEVEL = 'L' as const;
export const RAPTOR_REPAIR_PERCENT = 20;

const SESSION_HEADER_SIZE = 6;
const SESSION_MAGIC = 0x524c; // "LR" in little-endian.
export const RAPTOR_MAX_TRANSFER_SIZE = 0xffffff;

export interface RaptorFrame {
  sessionId: number;
  packet: Packet;
}

export function getRaptorCapacity(version: number) {
  const qrProfile = createQRTransferProfile(version, RAPTOR_ECC_LEVEL);
  const symbolSize = qrProfile.maxPayloadSize - SESSION_HEADER_SIZE;
  return { qrProfile, symbolSize, sourceBytes: symbolSize - 4 };
}

export async function createRaptorTransfer(
  data: Uint8Array,
  sessionId: number,
  settings: RaptorSettings = DEFAULT_RAPTOR_SETTINGS,
) {
  if (data.length > RAPTOR_MAX_TRANSFER_SIZE) {
    throw new Error('Передача больше 16 МБ пока не поддерживается.');
  }

  const capacity = getRaptorCapacity(settings.version);
  const encoded = await packetizeRaptorQ(data, false, false, undefined, undefined, {
    maxTransportPayloadSize: capacity.symbolSize,
    repairPercent: RAPTOR_REPAIR_PERCENT,
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
    sourceBytes: capacity.sourceBytes,
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
  const frame = new Uint8Array(SESSION_HEADER_SIZE + packet.length);
  const view = new DataView(frame.buffer);
  view.setUint16(0, SESSION_MAGIC, true);
  view.setUint32(2, sessionId, true);
  frame.set(packet, SESSION_HEADER_SIZE);
  return frame;
}
