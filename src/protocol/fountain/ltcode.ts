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

  private prng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  public getDegree(seed: number): number {
    if (this.K === 1) return 1;
    const rand = this.prng(seed)();

    if (rand < 1 / this.K) return 1;
    const d = Math.min(this.K, Math.floor(1 / rand));
    return Math.max(1, Math.min(this.K, d));
  }

  public getBlockIndices(seed: number, degree: number): number[] {
    if (degree >= this.K) {
      return Array.from({ length: this.K }, (_, i) => i);
    }
    const rand = this.prng(seed + 1000);
    const indices = new Set<number>();
    while (indices.size < degree) {
      const idx = Math.floor(rand() * this.K);
      indices.add(idx);
    }
    return Array.from(indices);
  }

  public generateSymbol(symbolId: number): FountainSymbol {
    if (symbolId < this.K) {
      return {
        symbolId,
        seed: symbolId,
        degree: 1,
        blockIndices: [symbolId],
        data: new Uint8Array(this.blocks[symbolId]),
      };
    }

    const seed = (symbolId * 2654435761) >>> 0;
    const degree = this.getDegree(seed);
    const blockIndices = this.getBlockIndices(seed, degree);

    const data = new Uint8Array(this.blockSize);
    for (const idx of blockIndices) {
      const src = this.blocks[idx];
      for (let b = 0; b < this.blockSize; b++) {
        data[b] ^= src[b];
      }
    }

    return {
      symbolId,
      seed,
      degree,
      blockIndices,
      data,
    };
  }
}
