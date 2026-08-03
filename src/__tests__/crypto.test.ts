import { describe, it, expect } from 'vitest';
import { LOTPCrypto } from '../protocol/crypto/aesgcm';

describe('AES-256-GCM Encryption', () => {
  it('encrypts and decrypts payload correctly with matching password', async () => {
    const rawData = new TextEncoder().encode('Confidential Optical Payload 123');
    const password = 'SuperSecretPassword!';

    const encrypted = await LOTPCrypto.encrypt(rawData, password);
    expect(encrypted.ciphertext.length).toBeGreaterThan(0);

    const decrypted = await LOTPCrypto.decrypt(encrypted, password);
    expect(new TextDecoder().decode(decrypted)).toBe('Confidential Optical Payload 123');
  });

  it('fails decryption on wrong password', async () => {
    const rawData = new TextEncoder().encode('Confidential Data');
    const password = 'CorrectPassword';

    const encrypted = await LOTPCrypto.encrypt(rawData, password);

    await expect(LOTPCrypto.decrypt(encrypted, 'WrongPassword')).rejects.toThrow();
  });
});
