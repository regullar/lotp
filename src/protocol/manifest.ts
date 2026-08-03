import { LOTP_MAGIC, LOTP_VERSION, PaletteMode } from './constants';
import { LOTPContainer } from './container/lotpContainer';

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
    cryptoMeta?: { saltHex: string; noncePrefixHex: string }
  ): Promise<SessionManifest> {
    const fileMetas: FileMetadata[] = [];
    let totalSize = 0;

    for (const f of files) {
      const sha256 = await LOTPContainer.calcSHA256(f.data);
      fileMetas.push({
        name: f.file.name,
        size: f.data.length,
        mimeType: f.file.type || 'application/octet-stream',
        sha256,
      });
      totalSize += f.data.length;
    }

    const containerSha256 = await LOTPContainer.calcSHA256(containerData);
    const totalBlocks = Math.ceil(containerData.length / blockSize);

    return {
      magic: 'LOTP',
      version: LOTP_VERSION,
      sessionId,
      filesCount: files.length,
      totalSize,
      files: fileMetas,
      containerSha256,
      blockSize,
      totalBlocks,
      profileId,
      paletteMode,
      isEncrypted,
      saltHex: cryptoMeta?.saltHex,
      noncePrefixHex: cryptoMeta?.noncePrefixHex,
      timestamp: Date.now(),
    };
  }

  public static encode(manifest: SessionManifest): Uint8Array {
    const jsonStr = JSON.stringify(manifest);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    const buf = new Uint8Array(4 + 2 + jsonBytes.length);
    buf.set(LOTP_MAGIC, 0);
    const view = new DataView(buf.buffer);
    view.setUint16(4, LOTP_VERSION, false);
    buf.set(jsonBytes, 6);
    return buf;
  }

  public static decode(data: Uint8Array): SessionManifest | null {
    try {
      if (data.length < 6) return null;
      if (data[0] !== 0x4c || data[1] !== 0x4f || data[2] !== 0x54 || data[3] !== 0x50) return null;
      const jsonStr = new TextDecoder().decode(data.subarray(6));
      const manifest: SessionManifest = JSON.parse(jsonStr);
      return manifest;
    } catch {
      return null;
    }
  }
}
