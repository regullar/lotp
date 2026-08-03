/**
 * Systematic Luby Transform (LT) Fountain Encoder
 */

export interface FountainSymbol {
  symbolId: number;
  seed: number;
  degree: number;
  blockIndices: number[];
  data: Uint8Array;
}

export class LTEncoder {
  private blocks: Uint8Array[];
  private K: number;
  private blockSize: number;

  constructor(sourceData: Uint8Array, blockSize: number) {
    this.blockSize = blockSize;
    this.K = Math.max(1, Math.ceil(sourceData.length / blockSize));
    this.blocks = new Array(this.K);

    for (let i = 0; i < this.K; i++) {
      const block = new Uint8Array(blockSize);
      const start = i * blockSize;
      const end = Math.min(sourceData.length, start + blockSize);
      block.set(sourceData.subarray(start, end));
      this.blocks[i] = block;
    }
  }

  public getK(): number {
    return this.K;
  }

  public getBlockSize(): number {
    return this.blockSize;
  }

  private static prng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  public getDegree(seed: number): number {
    return LTEncoder.getDegreeForK(seed, this.K);
  }

  private static getDegreeForK(seed: number, K: number): number {
    if (K === 1) return 1;
    const rand = this.prng(seed)();

    if (rand < 1 / K) return 1;
    const d = Math.min(K, Math.floor(1 / rand));
    return Math.max(1, Math.min(K, d));
  }

  public getBlockIndices(seed: number, degree: number): number[] {
    return LTEncoder.getBlockIndicesForK(seed, degree, this.K);
  }

  private static getBlockIndicesForK(seed: number, degree: number, K: number): number[] {
    if (degree >= K) {
      return Array.from({ length: K }, (_, i) => i);
    }
    const rand = this.prng(seed + 1000);
    const indices = new Set<number>();
    while (indices.size < degree) {
      const idx = Math.floor(rand() * K);
      indices.add(idx);
    }
    return Array.from(indices);
  }

  public static getSymbolMetadata(symbolId: number, K: number): Omit<FountainSymbol, 'data'> {
    if (!Number.isInteger(symbolId) || symbolId < 0 || !Number.isInteger(K) || K < 1) {
      throw new Error('Invalid fountain symbol metadata.');
    }
    if (symbolId < K) {
      return { symbolId, seed: symbolId, degree: 1, blockIndices: [symbolId] };
    }

    const seed = (symbolId * 2654435761) >>> 0;
    const degree = this.getDegreeForK(seed, K);
    return {
      symbolId,
      seed,
      degree,
      blockIndices: this.getBlockIndicesForK(seed, degree, K),
    };
  }

  public generateSymbol(symbolId: number): FountainSymbol {
    const metadata = LTEncoder.getSymbolMetadata(symbolId, this.K);
    const { blockIndices } = metadata;

    const data = new Uint8Array(this.blockSize);
    for (const idx of blockIndices) {
      const src = this.blocks[idx];
      for (let b = 0; b < this.blockSize; b++) {
        data[b] ^= src[b];
      }
    }

    return {
      ...metadata,
      data,
    };
  }
}
