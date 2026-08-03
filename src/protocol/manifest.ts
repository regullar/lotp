import { LOTP_MAGIC, LOTP_VERSION, PaletteMode } from './constants';
import { LOTPContainer } from './container/lotpContainer';
import { crc32c } from './crc32c';

export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  sha256: string;
}

export interface SessionManifest {
  magic: string;
  version: number;
  sessionId: string;
  filesCount: number;
  totalSize: number;
  files: FileMetadata[];
  containerSha256: string;
  blockSize: number;
  totalBlocks: number;
  profileId: string;
  paletteMode: PaletteMode;
  isEncrypted: boolean;
  isCompressed: boolean;
  saltHex?: string;
  noncePrefixHex?: string;
  timestamp: number;
}

export class ManifestSerializer {
  public static async create(
    sessionId: string,
    files: { file: File; data: Uint8Array }[],
    containerData: Uint8Array,
    blockSize: number,
    profileId: string,
    paletteMode: PaletteMode,
    isEncrypted = false,
    cryptoMeta?: { saltHex: string; noncePrefixHex: string },
    isCompressed = false,
  ): Promise<SessionManifest> {
    const [fileMetas, containerSha256] = await Promise.all([
      Promise.all(files.map(async (f): Promise<FileMetadata> => ({
        name: f.file.name,
        size: f.data.length,
        mimeType: f.file.type || 'application/octet-stream',
        sha256: await LOTPContainer.calcSHA256(f.data),
      }))),
      LOTPContainer.calcSHA256(containerData),
    ]);
    const totalBlocks = Math.ceil(containerData.length / blockSize);

    return {
      magic: 'LOTP',
      version: LOTP_VERSION,
      sessionId,
      filesCount: files.length,
      totalSize: containerData.length,
      files: fileMetas,
      containerSha256,
      blockSize,
      totalBlocks,
      profileId,
      paletteMode,
      isEncrypted,
      isCompressed,
      saltHex: cryptoMeta?.saltHex,
      noncePrefixHex: cryptoMeta?.noncePrefixHex,
      timestamp: Date.now(),
    };
  }

  public static encode(manifest: SessionManifest): Uint8Array {
    const encrypted = manifest.isEncrypted;
    const buf = new Uint8Array(encrypted ? 40 : 16);
    buf.set(LOTP_MAGIC, 0);
    const view = new DataView(buf.buffer);
    buf[4] = LOTP_VERSION;
    buf[5] = (encrypted ? 1 : 0) | (manifest.paletteMode << 1) | (manifest.isCompressed ? 8 : 0);
    view.setUint32(6, manifest.totalSize, false);
    view.setUint16(10, manifest.blockSize, false);
    view.setUint32(12, manifest.totalBlocks, false);

    if (encrypted) {
      const salt = this.hexToBytes(manifest.saltHex, 16);
      const noncePrefix = this.hexToBytes(manifest.noncePrefixHex, 8);
      if (!salt || !noncePrefix) throw new Error('Encrypted manifest is missing crypto metadata.');
      buf.set(salt, 16);
      buf.set(noncePrefix, 32);
    }

    return buf;
  }

  public static decode(data: Uint8Array): SessionManifest | null {
    try {
      if (data.length < 16) return null;
      if (data[0] !== 0x4c || data[1] !== 0x4f || data[2] !== 0x54 || data[3] !== 0x50) return null;
      if (data[4] !== LOTP_VERSION) return null;

      const encrypted = (data[5] & 1) !== 0;
      if (data.length < (encrypted ? 40 : 16)) return null;

      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const totalSize = view.getUint32(6, false);
      const blockSize = view.getUint16(10, false);
      const totalBlocks = view.getUint32(12, false);
      if (!totalSize || !blockSize || totalBlocks !== Math.ceil(totalSize / blockSize)) return null;

      return {
        magic: 'LOTP',
        version: LOTP_VERSION,
        sessionId: '',
        filesCount: 0,
        totalSize,
        files: [],
        containerSha256: '',
        blockSize,
        totalBlocks,
        profileId: '',
        paletteMode: ((data[5] >> 1) & 0x03) as PaletteMode,
        isEncrypted: encrypted,
        isCompressed: (data[5] & 8) !== 0,
        saltHex: encrypted ? this.bytesToHex(data.subarray(16, 32)) : undefined,
        noncePrefixHex: encrypted ? this.bytesToHex(data.subarray(32, 40)) : undefined,
        timestamp: 0,
      };
    } catch {
      return null;
    }
  }

  public static fragment(data: Uint8Array, payloadSize: number): Uint8Array[] {
    const chunkSize = payloadSize - 4;
    if (chunkSize < 1) throw new Error('Manifest payload size is too small.');

    const total = Math.ceil(data.length / chunkSize);
    if (total > 255) throw new Error('Manifest requires too many fragments.');

    const id = crc32c(data) & 0xffff;
    return Array.from({ length: total }, (_, index) => {
      const payload = new Uint8Array(payloadSize);
      const view = new DataView(payload.buffer);
      view.setUint16(0, id, false);
      payload[2] = total;
      payload[3] = index;
      payload.set(data.subarray(index * chunkSize, (index + 1) * chunkSize), 4);
      return payload;
    });
  }

  public static assemble(fragments: Uint8Array[]): Uint8Array | null {
    if (!fragments.length) return null;

    const first = fragments[0];
    if (first.length < 5 || !first[2]) return null;
    const firstView = new DataView(first.buffer, first.byteOffset, first.byteLength);
    const id = firstView.getUint16(0, false);
    const total = first[2];
    const chunks: (Uint8Array | undefined)[] = new Array(total);

    for (const fragment of fragments) {
      if (fragment.length !== first.length || fragment[2] !== total || fragment[3] >= total) return null;
      const view = new DataView(fragment.buffer, fragment.byteOffset, fragment.byteLength);
      if (view.getUint16(0, false) !== id) return null;
      chunks[fragment[3]] = fragment.subarray(4);
    }
    if (chunks.some((chunk) => !chunk)) return null;

    const joined = new Uint8Array(total * (first.length - 4));
    chunks.forEach((chunk, index) => joined.set(chunk!, index * (first.length - 4)));
    const expectedLength = (joined[5] & 1) !== 0 ? 40 : 16;
    if (joined.length < expectedLength) return null;

    const manifest = joined.subarray(0, expectedLength);
    return (crc32c(manifest) & 0xffff) === id ? manifest : null;
  }

  private static hexToBytes(hex: string | undefined, length: number): Uint8Array | null {
    if (!hex || hex.length !== length * 2 || !/^[0-9a-f]+$/i.test(hex)) return null;
    return Uint8Array.from({ length }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16));
  }

  private static bytesToHex(data: Uint8Array): string {
    return Array.from(data, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
