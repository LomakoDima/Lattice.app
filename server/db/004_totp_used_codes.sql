-- Prevent TOTP replay attacks by storing recently used codes.
-- Each code is valid for one window (~30s); we keep codes for 2 minutes to cover clock drift.
CREATE TABLE IF NOT EXISTS totp_used_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code        CHAR(6) NOT NULL,
  used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT totp_used_codes_unique UNIQUE (user_id, code, used_at)
);

CREATE INDEX IF NOT EXISTS idx_totp_used_codes_user_id ON totp_used_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_totp_used_codes_used_at ON totp_used_codes (used_at);
