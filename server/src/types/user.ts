export type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
  totp_secret: string | null;
  two_factor_enabled: boolean;
  created_at: Date;
  updated_at: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string | null;
  twoFactorEnabled: boolean;
};
