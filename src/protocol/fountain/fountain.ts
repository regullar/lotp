// Adapted from decimen-optical-transfer (MIT, Copyright 2026 BashAlarmist).
// See THIRD_PARTY_NOTICES.md.

const LN2 = 0.6931471805599453;
const SOLITON_C = 0.1;
const SOLITON_DELTA = 0.5;

function splitmix32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x9e3779b9) | 0;
    let value = state ^ (state >>> 16);
    value = Math.imul(value, 0x21f0aaad);
    value ^= value >>> 15;
    value = Math.imul(value, 0x735a2d97);
    value ^= value >>> 15;
    return value >>> 0;
  };
}

/** Deterministic log: Math.log may differ by an ulp between V8 and JavaScriptCore. */
export function dlog(value: number): number {
  let exponent = 0;
  let mantissa = value;
  while (mantissa >= 1.5) {
    mantissa /= 2;
    exponent++;
  }
  while (mantissa < 0.75) {
    mantissa *= 2;
    exponent--;
  }
  const z = (mantissa - 1) / (mantissa + 1);
  const z2 = z * z;
  let term = z;
  let sum = 0;
  for (let n = 1; n <= 21; n += 2) {
    sum += term / n;
    term *= z2;
  }
  return exponent * LN2 + 2 * sum;
}

export function solitonCdf(blockCount: number): Float64Array {
  const cdf = new Float64Array(blockCount);
  if (blockCount === 1) {
    cdf[0] = 1;
    return cdf;
  }
  const r = Math.max(
    1,
    SOLITON_C * dlog(blockCount / SOLITON_DELTA) * Math.sqrt(blockCount),
  );
  const spike = Math.min(blockCount, Math.ceil(blockCount / r));
  let total = 0;
  for (let degree = 1; degree <= blockCount; degree++) {
    const rho = degree === 1 ? 1 / blockCount : 1 / (degree * (degree - 1));
    let tau = 0;
    if (degree < spike) tau = r / (degree * blockCount);
    else if (degree === spike) {
      tau = (r * Math.max(0, dlog(r / SOLITON_DELTA))) / blockCount;
    }
    total += rho + tau;
    cdf[degree - 1] = total;
  }
  for (let index = 0; index < blockCount; index++) cdf[index] /= total;
  cdf[blockCount - 1] = 1;
  return cdf;
}

function frameSeed(sessionId: number, sequence: number): number {
  let hash = (Math.imul(sessionId + 1, 0x9e3779b1) ^ (sequence + 0x85ebca6b)) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) | 0;
}

export function frameIndices(
  blockCount: number,
  cdf: Float64Array,
  sessionId: number,
  sequence: number,
): number[] {
  const random = splitmix32(frameSeed(sessionId, sequence));
  const sample = random() * 2 ** -32;
  let low = 0;
  let high = blockCount - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (cdf[middle] >= sample) high = middle;
    else low = middle + 1;
  }
  const degree = Math.min(blockCount, low + 1);

  if (degree > blockCount >> 3) {
    const scratch = new Uint32Array(blockCount);
    for (let index = 0; index < blockCount; index++) scratch[index] = index;
    const output = new Array<number>(degree);
    for (let index = 0; index < degree; index++) {
      const swapIndex = index + (random() % (blockCount - index));
      const value = scratch[index];
      scratch[index] = scratch[swapIndex];
      scratch[swapIndex] = value;
      output[index] = scratch[index];
    }
    return output;
  }

  const indices = new Set<number>();
  while (indices.size < degree) indices.add(random() % blockCount);
  return [...indices];
}

function xorInto(target: Uint32Array, source: Uint32Array): void {
  for (let index = 0; index < target.length; index++) {
    target[index] = (target[index] ^ source[index]) >>> 0;
  }
}

export class LTEncoder {
  readonly blockCount: number;
  private readonly words: number;
  private readonly blocks: Uint32Array;
  private readonly cdf: Float64Array;

  constructor(
    payload: Uint8Array,
    readonly blockSize: number,
    readonly sessionId: number,
  ) {
    this.blockCount = Math.max(1, Math.ceil(payload.length / blockSize));
    this.words = Math.ceil(blockSize / 4);
    this.blocks = new Uint32Array(this.blockCount * this.words);
    const blockBytes = new Uint8Array(this.blocks.buffer);
    for (let block = 0; block < this.blockCount; block++) {
      const source = payload.subarray(
        block * blockSize,
        Math.min((block + 1) * blockSize, payload.length),
      );
      blockBytes.set(source, block * this.words * 4);
    }
    this.cdf = solitonCdf(this.blockCount);
  }

  encode(sequence: number): Uint8Array {
    const indices = frameIndices(this.blockCount, this.cdf, this.sessionId, sequence);
    const output = new Uint32Array(this.words);
    for (const block of indices) {
      const offset = block * this.words;
      for (let word = 0; word < this.words; word++) {
        output[word] = (output[word] ^ this.blocks[offset + word]) >>> 0;
      }
    }
    return new Uint8Array(output.buffer, 0, this.blockSize);
  }
}

interface PendingFrame {
  indices: Set<number>;
  words: Uint32Array;
}

export class LTDecoder {
  private readonly words: number;
  private readonly cdf: Float64Array;
  private readonly solved: (Uint32Array | null)[];
  private readonly byBlock = new Map<number, Set<PendingFrame>>();
  private readonly seen = new Set<number>();
  solvedCount = 0;
  framesNew = 0;
  framesDuplicate = 0;

  constructor(
    readonly blockCount: number,
    readonly blockSize: number,
    readonly sessionId: number,
    readonly totalSize: number,
  ) {
    this.words = Math.ceil(blockSize / 4);
    this.cdf = solitonCdf(blockCount);
    this.solved = new Array<Uint32Array | null>(blockCount).fill(null);
  }

  get isComplete(): boolean {
    return this.solvedCount >= this.blockCount;
  }

  addFrame(sequence: number, block: Uint8Array): void {
    if (this.seen.has(sequence)) {
      this.framesDuplicate++;
      return;
    }
    this.seen.add(sequence);
    this.framesNew++;
    if (this.isComplete) return;

    const indices = new Set(frameIndices(this.blockCount, this.cdf, this.sessionId, sequence));
    const words = new Uint32Array(this.words);
    new Uint8Array(words.buffer).set(block.subarray(0, this.blockSize));
    for (const blockIndex of [...indices]) {
      const solved = this.solved[blockIndex];
      if (solved) {
        xorInto(words, solved);
        indices.delete(blockIndex);
      }
    }
    if (indices.size === 0) return;
    if (indices.size === 1) {
      this.resolve(indices.values().next().value!, words);
      return;
    }

    const pending = { indices, words };
    for (const blockIndex of indices) {
      let frames = this.byBlock.get(blockIndex);
      if (!frames) {
        frames = new Set();
        this.byBlock.set(blockIndex, frames);
      }
      frames.add(pending);
    }
  }

  private resolve(firstBlock: number, firstWords: Uint32Array): void {
    const queue: [number, Uint32Array][] = [[firstBlock, firstWords]];
    while (queue.length > 0) {
      const [blockIndex, words] = queue.pop()!;
      if (this.solved[blockIndex]) continue;
      this.solved[blockIndex] = words;
      this.solvedCount++;
      const waiting = this.byBlock.get(blockIndex);
      if (!waiting) continue;
      this.byBlock.delete(blockIndex);
      for (const pending of waiting) {
        xorInto(pending.words, words);
        pending.indices.delete(blockIndex);
        if (pending.indices.size === 1) {
          const remaining = pending.indices.values().next().value!;
          this.byBlock.get(remaining)?.delete(pending);
          if (!this.solved[remaining]) queue.push([remaining, pending.words]);
        }
      }
    }
  }

  reconstruct(): Uint8Array | null {
    if (!this.isComplete) return null;
    const output = new Uint8Array(this.totalSize);
    for (let block = 0; block < this.blockCount; block++) {
      const start = block * this.blockSize;
      const length = Math.min(this.blockSize, this.totalSize - start);
      if (length > 0) {
        output.set(new Uint8Array(this.solved[block]!.buffer, 0, length), start);
      }
    }
    return output;
  }
}
