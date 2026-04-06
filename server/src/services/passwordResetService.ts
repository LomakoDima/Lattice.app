import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import * as userService from './userService.js';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

/**
 * Generate a password reset token for the given email.
 * Always returns void (no error even if email doesn't exist) to avoid enumeration.
 * In production, this should send an email with the reset link.
 */
export async function requestPasswordReset(email: string): Promise<{ token: string } | null> {
  const client = await pool.connect();
  try {
    const row = await userService.findUserByEmail(client, email);
    if (!row?.password_hash) {
      return null;
    }

    const raw = crypto.randomBytes(RESET_TOKEN_BYTES).toString('base64url');
    const hash = hashToken(raw);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [row.id, hash, expiresAt]
    );

    // TODO: Send email with reset link containing `raw` token.
    // For now, return the token so the caller can construct the link.
    // In production, NEVER return the token in the HTTP response —
    // only send it via email. The route handler returns 200 regardless.
    return { token: raw };
  } finally {
    client.release();
  }
}

/**
 * Consume a password reset token and set a new password.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const hash = hashToken(token);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > NOW() AND used = FALSE
       FOR UPDATE`,
      [hash]
    );
    const row = rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
      [row.id]
    );

    // Invalidate all other reset tokens for this user
    await client.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND id != $2`,
      [row.user_id, row.id]
    );

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, row.user_id]
    );

    // Revoke all refresh tokens (force re-login)
    await client.query(
      `DELETE FROM refresh_tokens WHERE user_id = $1`,
      [row.user_id]
    );

    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
