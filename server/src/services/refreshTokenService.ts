import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
} from './tokenService.js';

export { generateRefreshToken };

export async function saveRefreshToken(
  client: PoolClient,
  userId: string,
  rawToken: string
): Promise<void> {
  const hash = hashRefreshToken(rawToken);
  const expiresAt = refreshExpiresAt();
  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );
}

export async function deleteRefreshTokenByHash(
  client: PoolClient,
  rawToken: string
): Promise<void> {
  const hash = hashRefreshToken(rawToken);
  await client.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [hash]);
}

/** One-time use: removes row and returns user_id if valid. */
export async function consumeRefreshToken(
  client: PoolClient,
  rawToken: string
): Promise<{ user_id: string } | null> {
  const hash = hashRefreshToken(rawToken);
  const { rows } = await client.query<{ user_id: string }>(
    `DELETE FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > NOW()
     RETURNING user_id`,
    [hash]
  );
  return rows[0] ?? null;
}

/** Revoke every refresh session for a user (sign out everywhere, or before issuing a new login session). */
export async function revokeAllRefreshTokensForUser(
  client: PoolClient,
  userId: string
): Promise<void> {
  await client.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
}

export async function revokeAllRefreshTokensForUserId(userId: string): Promise<void> {
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
}
