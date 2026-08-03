import type { FountainSymbol } from './ltcode';

export class LTPeelingDecoder {
  private K: number;
  private blockSize: number;
  private totalDataLen: number;
  private solvedBlocks: (Uint8Array | null)[];
  private numSolved = 0;
  private receivedSymbols: FountainSymbol[] = [];

  constructor(K: number, blockSize: number, totalDataLen: number) {
    this.K = K;
    this.blockSize = blockSize;
    this.totalDataLen = totalDataLen;
    this.solvedBlocks = new Array(K).fill(null);
  }

  public getProgress(): number {
    return this.numSolved / this.K;
  }

  public isComplete(): boolean {
    return this.numSolved === this.K;
  }

  public getSolvedCount(): number {
    return this.numSolved;
  }

  public getTotalBlocks(): number {
    return this.K;
  }

  public addSymbol(symbol: FountainSymbol): boolean {
    if (this.isComplete()) return true;

    const activeIndices = symbol.blockIndices.filter((idx) => this.solvedBlocks[idx] === null);
    const dataCopy = new Uint8Array(symbol.data);

    for (const idx of symbol.blockIndices) {
      if (this.solvedBlocks[idx] !== null) {
        const solved = this.solvedBlocks[idx]!;
        for (let i = 0; i < this.blockSize; i++) {
          dataCopy[i] ^= solved[i];
        }
      }
    }

    if (activeIndices.length === 0) {
      return this.isComplete();
    }

    const reducedSymbol: FountainSymbol = {
      ...symbol,
      degree: activeIndices.length,
      blockIndices: activeIndices,
      data: dataCopy,
    };

    this.receivedSymbols.push(reducedSymbol);

    this.peel();
    return this.isComplete();
  }

  private peel(): void {
    let progress = true;

    while (progress) {
      progress = false;
      const queue: { blockIdx: number; data: Uint8Array }[] = [];

      for (let i = this.receivedSymbols.length - 1; i >= 0; i--) {
        const sym = this.receivedSymbols[i];

        sym.blockIndices = sym.blockIndices.filter((idx) => this.solvedBlocks[idx] === null);

        if (sym.blockIndices.length === 1) {
          const blockIdx = sym.blockIndices[0];
          if (this.solvedBlocks[blockIdx] === null) {
            queue.push({ blockIdx, data: new Uint8Array(sym.data) });
            this.solvedBlocks[blockIdx] = new Uint8Array(sym.data);
            this.numSolved++;
            progress = true;
          }
          this.receivedSymbols.splice(i, 1);
        } else if (sym.blockIndices.length === 0) {
          this.receivedSymbols.splice(i, 1);
        }
      }

      for (const { blockIdx, data } of queue) {
        for (const sym of this.receivedSymbols) {
          const pos = sym.blockIndices.indexOf(blockIdx);
          if (pos !== -1) {
            for (let b = 0; b < this.blockSize; b++) {
              sym.data[b] ^= data[b];
            }
            sym.blockIndices.splice(pos, 1);
          }
        }
      }
    }
  }

  public reconstruct(): Uint8Array | null {
    if (!this.isComplete()) return null;

    const result = new Uint8Array(this.totalDataLen);
    let offset = 0;

    for (let i = 0; i < this.K; i++) {
      const block = this.solvedBlocks[i]!;
      const copyLen = Math.min(this.blockSize, this.totalDataLen - offset);
      result.set(block.subarray(0, copyLen), offset);
      offset += copyLen;
    }

    return result;
  }
}
