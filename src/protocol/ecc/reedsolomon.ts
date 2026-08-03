/**
 * Reed-Solomon Encoder and Decoder for Galois Field GF(2^8) with primitive polynomial 0x11d (285).
 */
export class ReedSolomon {
  private gfExp = new Uint8Array(512);
  private gfLog = new Uint8Array(256);

  constructor() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.gfExp[i] = x;
      this.gfExp[i + 255] = x;
      this.gfLog[x] = i;
      x <<= 1;
      if (x & 0x100) {
        x ^= 0x11d;
      }
    }
  }

  public gfMul(x: number, y: number): number {
    if (x === 0 || y === 0) return 0;
    return this.gfExp[this.gfLog[x] + this.gfLog[y]];
  }

  public gfDiv(x: number, y: number): number {
    if (y === 0) throw new Error('Division by zero in GF(2^8)');
    if (x === 0) return 0;
    return this.gfExp[(this.gfLog[x] + 255 - this.gfLog[y]) % 255];
  }

  public polyMul(p1: Uint8Array, p2: Uint8Array): any {
    const res = new Uint8Array(p1.length + p2.length - 1);
    for (let i = 0; i < p1.length; i++) {
      for (let j = 0; j < p2.length; j++) {
        res[i + j] ^= this.gfMul(p1[i], p2[j]);
      }
    }
    return res as any;
  }

  public generatorPoly(nsym: number): any {
    let g = new Uint8Array([1]);
    for (let i = 0; i < nsym; i++) {
      g = this.polyMul(g, new Uint8Array([1, this.gfExp[i]]));
    }
    return g as any;
  }

  public encode(msg: Uint8Array, nsym: number): any {
    const gen = this.generatorPoly(nsym);
    const res = new Uint8Array(msg.length + nsym);
    res.set(msg, 0);

    for (let i = 0; i < msg.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 1; j < gen.length; j++) {
          res[i + j] ^= this.gfMul(gen[j], coef);
        }
      }
    }
    const out = new Uint8Array(res.length);
    for (let i = 0; i < res.length; i++) out[i] = res[i];
    for (let i = 0; i < msg.length; i++) out[i] = msg[i];
    return out as any;
  }

  public calcSyndromes(msg: Uint8Array, nsym: number): any {
    const synd = new Uint8Array(nsym);
    let hasError = false;
    for (let i = 0; i < nsym; i++) {
      let val = 0;
      const x = this.gfExp[i];
      for (let j = 0; j < msg.length; j++) {
        val = this.gfMul(val, x) ^ msg[j];
      }
      synd[i] = val;
      if (val !== 0) hasError = true;
    }
    return (hasError ? synd : new Uint8Array(0)) as any;
  }

  public decode(msg: Uint8Array, nsym: number): Uint8Array | null {
    const synd = this.calcSyndromes(msg, nsym);
    if (synd.length === 0) {
      return msg.slice(0, msg.length - nsym) as any;
    }

    const S0 = synd[0];
    const S1 = synd[1];
    const corrected = new Uint8Array(msg);

    // 1-error solver
    if (S0 !== 0 && S1 !== undefined) {
      const X1 = this.gfDiv(S1, S0);
      for (let i = 0; i < msg.length; i++) {
        if (this.gfExp[(msg.length - 1 - i) % 255] === X1) {
          corrected[i] ^= S0;
          if (this.calcSyndromes(corrected, nsym).length === 0) {
            return corrected.slice(0, msg.length - nsym) as any;
          }
          corrected[i] ^= S0; // revert
        }
      }
    }

    // 2-error solver
    for (let pos1 = 0; pos1 < msg.length; pos1++) {
      for (let pos2 = pos1 + 1; pos2 < msg.length; pos2++) {
        const X1 = this.gfExp[(msg.length - 1 - pos1) % 255];
        const X2 = this.gfExp[(msg.length - 1 - pos2) % 255];
        const denom = X1 ^ X2;
        if (denom === 0) continue;
        const Y2 = this.gfDiv(this.gfMul(S0, X1) ^ S1, denom);
        const Y1 = S0 ^ Y2;

        corrected[pos1] ^= Y1;
        corrected[pos2] ^= Y2;

        if (this.calcSyndromes(corrected, nsym).length === 0) {
          return corrected.slice(0, msg.length - nsym) as any;
        }
        corrected[pos1] ^= Y1;
        corrected[pos2] ^= Y2;
      }
    }

    return null;
  }
}

export const rsInstance = new ReedSolomon();
