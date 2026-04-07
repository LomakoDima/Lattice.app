import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
<<<<<<< HEAD
import { decryptTotpSecret, isEncrypted } from '../lib/totpCipher.js';
=======
import { pool } from '../db/pool.js';
import type { PoolClient } from 'pg';
>>>>>>> main

/** Base32 secret as stored / shown (spaces stripped, case normalized for decoders). */
export function normalizeTotpSecret(secret: string): string {
  return secret.trim().replace(/\s/g, '').toUpperCase();
}

export function generateTotpSecret(): string {
  return generateSecret();
}

/**
 * Recover the plaintext Base32 secret from a DB value that may be
 * AES-256-GCM encrypted (new) or legacy plaintext Base32 (old rows).
 */
export function resolveTotpSecret(stored: string): string {
  if (isEncrypted(stored)) {
    return decryptTotpSecret(stored);
  }
  return stored;
}

/**
 * Verify TOTP. Uses epoch tolerance — otplib defaults to 0s drift, which rejects valid codes
 * if phone/server clocks differ slightly; Microsoft/Google Authenticator expect ±1 step (~30s).
 * Stateless — does NOT check replay. Use verifyTotpCodeOnce for login/sensitive flows.
 */
export function verifyTotpCode(storedSecret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const plain = resolveTotpSecret(storedSecret);
  const secretNorm = normalizeTotpSecret(plain);
  if (!secretNorm) return false;
  const result = verifySync({
    secret: secretNorm,
    token: normalized,
    epochTolerance: 30,
  });
  return result.valid === true;
}

/**
 * Verify TOTP and record code as used to prevent replay attacks.
 * Returns false if code is invalid OR already used within the last 2 minutes.
 * Must be called inside a transaction to be race-free.
 */
export async function verifyTotpCodeOnce(
  client: PoolClient,
  userId: string,
  secret: string,
  code: string
): Promise<boolean> {
  if (!verifyTotpCode(secret, code)) return false;

  // Purge codes older than 2 minutes (2x the TOTP window)
  await client.query(
    `DELETE FROM totp_used_codes WHERE used_at < NOW() - INTERVAL '2 minutes'`
  );

  // Try to insert this code; if it already exists (replay), the UNIQUE constraint fires
  try {
    await client.query(
      `INSERT INTO totp_used_codes (user_id, code, used_at) VALUES ($1, $2, NOW())`,
      [userId, code.replace(/\s/g, '')]
    );
  } catch (e: unknown) {
    // Postgres unique_violation = 23505
    if ((e as { code?: string }).code === '23505') return false;
    throw e;
  }
  return true;
}

/** Stateless variant for setup/enable where userId isn't yet committed. */
export async function verifyTotpCodeOnceSetup(
  userId: string,
  secret: string,
  code: string
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ok = await verifyTotpCodeOnce(client, userId, secret, code);
    await client.query('COMMIT');
    return ok;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function buildTotpEnrollment(
  email: string,
  secret: string
): Promise<{ otpauthUrl: string; qrDataUrl: string }> {
  const otpauthUrl = generateURI({
    issuer: 'Lattice',
    label: email,
    secret: normalizeTotpSecret(secret),
  });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { otpauthUrl, qrDataUrl };
}
