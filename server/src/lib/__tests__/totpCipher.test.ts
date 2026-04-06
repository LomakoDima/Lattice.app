import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock env module before importing totpCipher
vi.mock('../../config/env.js', () => ({
  env: {
    SESSION_SECRET: 'test-session-secret-at-least-16-chars-long',
  },
}));

import { encryptTotpSecret, decryptTotpSecret, isEncrypted } from '../totpCipher.js';

describe('totpCipher', () => {
  const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

  it('should encrypt and decrypt a TOTP secret', () => {
    const encrypted = encryptTotpSecret(secret);
    const decrypted = decryptTotpSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should produce different ciphertexts for the same input (random IV)', () => {
    const a = encryptTotpSecret(secret);
    const b = encryptTotpSecret(secret);
    expect(a).not.toBe(b);
  });

  it('should detect encrypted format', () => {
    const encrypted = encryptTotpSecret(secret);
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it('should detect plaintext Base32 as not encrypted', () => {
    expect(isEncrypted(secret)).toBe(false);
    expect(isEncrypted('ABCDE12345')).toBe(false);
  });

  it('should throw on corrupted ciphertext', () => {
    const encrypted = encryptTotpSecret(secret);
    const corrupted = encrypted.slice(0, -4) + 'ffff';
    expect(() => decryptTotpSecret(corrupted)).toThrow();
  });

  it('should throw on invalid format', () => {
    expect(() => decryptTotpSecret('not-valid')).toThrow('Invalid encrypted TOTP secret format');
  });
});
