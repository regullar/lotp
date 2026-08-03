import { describe, it, expect } from 'vitest';
import { LTEncoder } from '../protocol/fountain/ltcode';
import { LTPeelingDecoder } from '../protocol/fountain/peeling';

describe('Systematic LT Fountain Code', () => {
  it('reconstructs payload despite packet loss', () => {
    const testData = new Uint8Array(1024);
    for (let i = 0; i < testData.length; i++) {
      testData[i] = (i * 13 + 7) & 0xff;
    }

    const blockSize = 64;
    const encoder = new LTEncoder(testData, blockSize);
    const K = encoder.getK();
    const decoder = new LTPeelingDecoder(K, blockSize, testData.length);

    let symbolId = 0;
    while (!decoder.isComplete() && symbolId < K * 3) {
      const sym = encoder.generateSymbol(symbolId);
      // Simulate 15% random frame drop
      if (symbolId % 7 !== 2) {
        decoder.addSymbol(sym);
      }
      symbolId++;
    }

    expect(decoder.isComplete()).toBe(true);
    const reconstructed = decoder.reconstruct();
    expect(reconstructed).not.toBeNull();
    expect(Array.from(reconstructed!)).toEqual(Array.from(testData));
  });
});
