/**
 * Chunked AES-256-GCM Encryption & Decryption module using Web Crypto API.
 */

export interface EncryptedPayload {
  salt: Uint8Array;
  noncePrefix: Uint8Array;
  ciphertext: Uint8Array;
}

export class LOTPCrypto {
  public static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  public static generateNoncePrefix(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(8));
  }

  public static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),

      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  public static async encrypt(data: Uint8Array, password: string): Promise<EncryptedPayload> {
    const salt = this.generateSalt();
    const noncePrefix = this.generateNoncePrefix();
    const key = await this.deriveKey(password, salt);

    // Build 12-byte IV (8 bytes noncePrefix + 4 bytes counter 0)
    const iv = new Uint8Array(12);
    iv.set(noncePrefix, 0);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      data.slice().buffer as ArrayBuffer
    );

    return {
      salt,
      noncePrefix,
      ciphertext: new Uint8Array(encrypted),
    };
  }

  public static async decrypt(encryptedPayload: EncryptedPayload, password: string): Promise<Uint8Array> {
    const key = await this.deriveKey(password, encryptedPayload.salt);
    const iv = new Uint8Array(12);
    iv.set(encryptedPayload.noncePrefix, 0);

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv.buffer as ArrayBuffer,
        },
        key,
        encryptedPayload.ciphertext.slice().buffer as ArrayBuffer
      );
      return new Uint8Array(decrypted);
    } catch {
      throw new Error('Decryption failed: Incorrect password or tampered optical data.');
    }
  }
}
