-- Allow up to MAX_SESSIONS concurrent refresh tokens per user (default 10).
-- The application enforces this limit by deleting oldest tokens when exceeded.
-- No schema changes needed; this migration documents the policy.
-- Index to efficiently find the oldest tokens per user for eviction.
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_created
  ON refresh_tokens (user_id, created_at ASC);
