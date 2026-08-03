import { describe, it, expect } from 'vitest';
import { ReedSolomon } from '../protocol/ecc/reedsolomon';

describe('Reed-Solomon Error Correction', () => {
  const rs = new ReedSolomon();

  it('encodes and corrects byte errors within ECC capacity', () => {
    const msg = new Uint8Array([76, 79, 84, 80, 1, 2, 3, 4, 5, 6]);
    const eccBytes = 6;
    const encoded = rs.encode(msg, eccBytes);

    expect(encoded.length).toBe(msg.length + eccBytes);

    // Corrupt 2 bytes
    const corrupted = new Uint8Array(encoded);
    corrupted[2] ^= 0xff;
    corrupted[5] ^= 0xaa;

    const decoded = rs.decode(corrupted, eccBytes);
    expect(decoded).not.toBeNull();
    expect(Array.from(decoded!)).toEqual(Array.from(msg));
  });
});
