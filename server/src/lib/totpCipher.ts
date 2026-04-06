/**
 * AES-256-GCM encryption for TOTP secrets at rest.
 *
 * Uses the first 32 bytes of SHA-256(SESSION_SECRET) as the encryption key.
 * Each encrypted value is stored as: iv:authTag:ciphertext (all hex).
 *
 * Transparent to callers: encrypt before DB write, decrypt after DB read.
 */
import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function deriveKey(): Buffer {
  return crypto.createHash('sha256').update(env.SESSION_SECRET).digest();
}

export function encryptTotpSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTotpSecret(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted TOTP secret format');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const key = deriveKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Detects whether a stored value is already encrypted (hex:hex:hex format)
 * vs plaintext Base32. Useful for transparent migration of existing rows.
 */
export function isEncrypted(stored: string): boolean {
  return /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(stored);
}
