export type OAuthProvider = 'google' | 'github';

export type LocalUser = {
  id: string;
  email?: string;
  twoFactorEnabled?: boolean;
  user_metadata?: { full_name?: string; name?: string };
};

export interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<'ok' | '2fa_required'>;
  verifyTwoFactor: (code: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  /** Revokes all refresh sessions server-side; current browser session ends. */
  logoutAllDevices: () => Promise<void>;
  /** Reload user from GET /api/auth/me (e.g. after changing 2FA in settings). */
  refreshUser: () => Promise<void>;
}
