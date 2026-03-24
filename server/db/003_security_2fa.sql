-- TOTP 2FA (secret stored after successful enrollment; protect DB access)

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.totp_secret IS 'Base32 TOTP shared secret; set only after successful enrollment';
