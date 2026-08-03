import { describe, expect, it } from 'vitest';
import { LTDecoder, LTEncoder, frameIndices, solitonCdf } from '../protocol/fountain/fountain';

describe('robust LT fountain code', () => {
  it('reconstructs after joining mid-stream with dropped and duplicate frames', () => {
    const source = Uint8Array.from({ length: 4093 }, (_, index) => (index * 13 + 7) & 0xff);
    const encoder = new LTEncoder(source, 128, 4242);
    const decoder = new LTDecoder(encoder.blockCount, encoder.blockSize, encoder.sessionId, source.length);

    let sequence = encoder.blockCount * 3;
    const ceiling = sequence + encoder.blockCount * 20;
    while (!decoder.isComplete && sequence < ceiling) {
      const block = encoder.encode(sequence);
      if (sequence % 7 !== 2) {
        decoder.addFrame(sequence, block);
        decoder.addFrame(sequence, block);
      }
      sequence++;
    }

    expect(decoder.isComplete).toBe(true);
    expect(decoder.reconstruct()).toEqual(source);
    expect(decoder.framesDuplicate).toBeGreaterThan(0);
  });

  it('keeps the wire-level block selection deterministic', () => {
    expect(frameIndices(17, solitonCdf(17), 4242, 0)).toEqual([3, 14]);
    expect(frameIndices(179, solitonCdf(179), 4242, 1000)).toEqual([39, 75, 24]);
  });
});
