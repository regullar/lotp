/**
 * Deterministic 2D Interleaver & Deinterleaver using PRNG permutation based on sessionId and frameId.
 */
export function generatePermutation(size: number, seed: number): number[] {
  const perm = Array.from({ length: size }, (_, i) => i);
  let state = seed >>> 0;

  // LCG PRNG for shuffling
  for (let i = size - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  return perm;
}

export function interleave(data: Uint8Array, seed: number): Uint8Array {
  const perm = generatePermutation(data.length, seed);
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[perm[i]] = data[i];
  }
  return result;
}

export function deinterleave(data: Uint8Array, seed: number): Uint8Array {
  const perm = generatePermutation(data.length, seed);
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[perm[i]];
  }
  return result;
}
