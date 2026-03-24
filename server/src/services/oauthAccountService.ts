import type { Pool, PoolClient } from 'pg';

export async function findOAuthAccount(
  db: Pool | PoolClient,
  provider: string,
  providerUserId: string
): Promise<{ user_id: string } | null> {
  const { rows } = await db.query<{ user_id: string }>(
    `SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2`,
    [provider, providerUserId]
  );
  return rows[0] ?? null;
}

export async function linkOAuthAccount(
  db: Pool | PoolClient,
  userId: string,
  provider: string,
  providerUserId: string
): Promise<void> {
  await db.query(
    `INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (provider, provider_user_id) DO NOTHING`,
    [userId, provider, providerUserId]
  );
}
