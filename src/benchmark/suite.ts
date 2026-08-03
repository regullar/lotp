import { PROFILES } from '../protocol/constants';
import { LTEncoder } from '../protocol/fountain/ltcode';
import { LTPeelingDecoder } from '../protocol/fountain/peeling';

export interface BenchmarkResult {
  profileId: string;
  profileName: string;
  testFileSizeKb: number;
  encodingTimeMs: number;
  fountainK: number;
  simulatedFPS: number;
  rawBitrateBps: number;
  payloadBitrateBps: number;
  usefulBitrateBps: number;
  recoveryTimeMs: number;
  efficiencyRatio: number;
}

export class BenchmarkSuite {
  public static async runProfileBenchmark(profileId: string, testSizeKb = 100): Promise<BenchmarkResult> {
    const profile = PROFILES[profileId] || PROFILES.reliable;
    const testData = new Uint8Array(testSizeKb * 1024);
    for (let i = 0; i < testData.length; i++) {
      testData[i] = (i * 37 + 11) & 0xff;
    }

    const startTime = performance.now();
    const encoder = new LTEncoder(testData, profile.fountainBlockSize, 1);
    const encodingTimeMs = performance.now() - startTime;

    const K = encoder.blockCount;
    const decoder = new LTPeelingDecoder(K, profile.fountainBlockSize, 1, testData.length);

    let symbolId = 0;
    const recStart = performance.now();
    while (!decoder.isComplete && symbolId < K * 5) {
      const block = encoder.encode(symbolId);
      if (symbolId % 10 !== 7) {
        decoder.addFrame(symbolId, block);
      }
      symbolId++;
    }
    const recoveryTimeMs = performance.now() - recStart;

    const totalBytesTransferred = symbolId * profile.fountainBlockSize;
    const durationSec = (recoveryTimeMs || 1) / 1000;

    const usefulBitrateBps = (testData.length * 8) / durationSec;
    const payloadBitrateBps = (totalBytesTransferred * 8) / durationSec;
    const rawBitrateBps = payloadBitrateBps * 1.25;

    return {
      profileId: profile.id,
      profileName: profile.name,
      testFileSizeKb: testSizeKb,
      encodingTimeMs: Math.round(encodingTimeMs * 100) / 100,
      fountainK: K,
      simulatedFPS: profile.targetFPS,
      rawBitrateBps: Math.round(rawBitrateBps),
      payloadBitrateBps: Math.round(payloadBitrateBps),
      usefulBitrateBps: Math.round(usefulBitrateBps),
      recoveryTimeMs: Math.round(recoveryTimeMs * 100) / 100,
      efficiencyRatio: Math.round((testData.length / totalBytesTransferred) * 1000) / 10,
    };
  }
}
