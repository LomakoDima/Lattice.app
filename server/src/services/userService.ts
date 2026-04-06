import type { Pool, PoolClient } from 'pg';
import type { PublicUser, UserRow } from '../types/user.js';
import { encryptTotpSecret } from '../lib/totpCipher.js';

function rowToPublic(r: UserRow): PublicUser {
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    twoFactorEnabled: Boolean(r.two_factor_enabled),
  };
}

export async function findUserById(
  db: Pool | PoolClient,
  id: string
): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    `SELECT id, email, password_hash, display_name, totp_secret, two_factor_enabled, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findUserByEmail(
  db: Pool | PoolClient,
  email: string
): Promise<UserRow | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await db.query<UserRow>(
    `SELECT id, email, password_hash, display_name, totp_secret, two_factor_enabled, created_at, updated_at
     FROM users WHERE email = $1`,
    [normalized]
  );
  return rows[0] ?? null;
}

export async function createUserWithPassword(
  db: Pool | PoolClient,
  input: { email: string; passwordHash: string; displayName?: string | null }
): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (email, password_hash, display_name, totp_secret, two_factor_enabled)
     VALUES ($1, $2, $3, NULL, FALSE)
     RETURNING id, email, password_hash, display_name, totp_secret, two_factor_enabled, created_at, updated_at`,
    [email, input.passwordHash, input.displayName ?? null]
  );
  const r = rows[0];
  if (!r) throw new Error('Failed to create user');
  return rowToPublic(r);
}

export async function createUserOAuthOnly(
  db: Pool | PoolClient,
  input: { email: string; displayName?: string | null }
): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (email, password_hash, display_name, totp_secret, two_factor_enabled)
     VALUES ($1, NULL, $2, NULL, FALSE)
     RETURNING id, email, password_hash, display_name, totp_secret, two_factor_enabled, created_at, updated_at`,
    [email, input.displayName ?? null]
  );
  const r = rows[0];
  if (!r) throw new Error('Failed to create user');
  return rowToPublic(r);
}

export async function enableUserTotp(
  db: Pool | PoolClient,
  userId: string,
  secret: string
): Promise<void> {
  const encrypted = encryptTotpSecret(secret);
  await db.query(
    `UPDATE users SET totp_secret = $2, two_factor_enabled = TRUE, updated_at = NOW() WHERE id = $1`,
    [userId, encrypted]
  );
}

export async function disableUserTotp(db: Pool | PoolClient, userId: string): Promise<void> {
  await db.query(
    `UPDATE users SET totp_secret = NULL, two_factor_enabled = FALSE, updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

export { rowToPublic };
