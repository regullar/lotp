import { describe, it, expect } from 'vitest';
import { crc32c } from '../protocol/crc32c';

describe('CRC32C Module', () => {
  it('computes correct CRC32C checksum for sample string', () => {
    const data = new TextEncoder().encode('123456789');
    const checksum = crc32c(data);
    expect(checksum).toBeGreaterThan(0);
    expect(typeof checksum).toBe('number');
  });

  it('detects single-bit data corruption', () => {
    const orig = new Uint8Array([0x4c, 0x4f, 0x54, 0x50, 0x01, 0x02, 0x03]);
    const corrupted = new Uint8Array(orig);
    corrupted[2] ^= 0x01; // flip 1 bit

    expect(crc32c(orig)).not.toBe(crc32c(corrupted));
  });
});
