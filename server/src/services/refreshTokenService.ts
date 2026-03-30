import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
} from './tokenService.js';

export { generateRefreshToken };

/**
 * Maximum concurrent refresh-token sessions per user.
 * When exceeded, the oldest session is evicted automatically.
 * This lets a user stay signed in on up to 10 devices simultaneously
 * without revoking every other session on each new login.
 */
const MAX_SESSIONS = 10;

export async function saveRefreshToken(
  client: PoolClient,
  userId: string,
  rawToken: string
): Promise<void> {
  const hash = hashRefreshToken(rawToken);
  const expiresAt = refreshExpiresAt();
  await client.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  );
  // Evict oldest tokens beyond the session cap (keeps the newest MAX_SESSIONS)
  await client.query(
    `DELETE FROM refresh_tokens
     WHERE user_id = $1
       AND id NOT IN (
         SELECT id FROM refresh_tokens
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2
       )`,
    [userId, MAX_SESSIONS]
  );
}

export async function deleteRefreshTokenByHash(
  client: PoolClient,
  rawToken: string
): Promise<void> {
  const hash = hashRefreshToken(rawToken);
  await client.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
}

/** One-time use: removes the row and returns user_id if the token is valid and not expired. */
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

/**
 * Revoke every session for a user.
 * Use ONLY for explicit "sign out all devices" flows.
 * Do NOT call on every normal login — use saveRefreshToken with the
 * session cap instead to allow multi-device usage.
 */
export async function revokeAllRefreshTokensForUser(
  client: PoolClient,
  userId: string
): Promise<void> {
  await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

export async function revokeAllRefreshTokensForUserId(userId: string): Promise<void> {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}
