/**
 * Streaming Multi-File Binary Container for LOTP v1.
 * Format per file:
 * [2B Name Length][UTF-8 Name][2B Mime Length][UTF-8 Mime][8B Size][8B LastModified][32B SHA-256][Data Bytes]
 */

export interface ContainerFile {
  name: string;
  mimeType: string;
  size: number;
  lastModified: number;
  sha256: string;
  data: Uint8Array;
}

export class LOTPContainer {
  public static async calcSHA256(data: Uint8Array): Promise<string> {
    const hashBuf = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public static async pack(files: { file: File; data: Uint8Array }[]): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];

    // Header count: 4 bytes
    const countBuf = new Uint8Array(4);
    new DataView(countBuf.buffer).setUint32(0, files.length, false); // Big endian
    parts.push(countBuf);

    for (const item of files) {
      const nameBytes = encoder.encode(item.file.name);
      const mimeBytes = encoder.encode(item.file.type || 'application/octet-stream');
      const sha256Hex = await this.calcSHA256(item.data);
      const sha256Bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        sha256Bytes[i] = parseInt(sha256Hex.substring(i * 2, i * 2 + 2), 16);
      }

      const metaHeader = new Uint8Array(2 + nameBytes.length + 2 + mimeBytes.length + 8 + 8 + 32);
      const view = new DataView(metaHeader.buffer);

      let offset = 0;
      view.setUint16(offset, nameBytes.length, false);
      offset += 2;
      metaHeader.set(nameBytes, offset);
      offset += nameBytes.length;

      view.setUint16(offset, mimeBytes.length, false);
      offset += 2;
      metaHeader.set(mimeBytes, offset);
      offset += mimeBytes.length;

      view.setBigUint64(offset, BigInt(item.data.length), false);
      offset += 8;

      view.setBigUint64(offset, BigInt(item.file.lastModified || Date.now()), false);
      offset += 8;

      metaHeader.set(sha256Bytes, offset);

      parts.push(metaHeader);
      parts.push(item.data);
    }

    // Combine all parts
    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLen);
    let currOffset = 0;
    for (const p of parts) {
      result.set(p, currOffset);
      currOffset += p.length;
    }
    return result;
  }

  public static async unpack(containerData: Uint8Array): Promise<ContainerFile[]> {
    const decoder = new TextDecoder();
    const view = new DataView(containerData.buffer, containerData.byteOffset, containerData.byteLength);

    let offset = 0;
    const fileCount = view.getUint32(offset, false);
    offset += 4;

    const files: ContainerFile[] = [];

    for (let f = 0; f < fileCount; f++) {
      const nameLen = view.getUint16(offset, false);
      offset += 2;
      const name = decoder.decode(containerData.subarray(offset, offset + nameLen));
      offset += nameLen;

      const mimeLen = view.getUint16(offset, false);
      offset += 2;
      const mimeType = decoder.decode(containerData.subarray(offset, offset + mimeLen));
      offset += mimeLen;

      const size = Number(view.getBigUint64(offset, false));
      offset += 8;

      const lastModified = Number(view.getBigUint64(offset, false));
      offset += 8;

      const sha256Bytes = containerData.subarray(offset, offset + 32);
      const sha256 = Array.from(sha256Bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      offset += 32;

      const data = containerData.subarray(offset, offset + size);
      offset += size;

      files.push({
        name,
        mimeType,
        size,
        lastModified,
        sha256,
        data,
      });
    }

    return files;
  }
}
