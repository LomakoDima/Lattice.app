import { useState, useEffect, ReactNode, useCallback } from 'react';
import { apiFetch, fetchRefreshSessionDeduped } from '../lib/api';
import { authDebug } from '../lib/authDebug';
import { AuthContext } from './auth-context';
import type { LocalUser, OAuthProvider } from './auth-types';

type ApiUser = {
  id: string;
  email: string;
  displayName: string | null;
  twoFactorEnabled: boolean;
};

function mapUser(u: ApiUser): LocalUser {
  return {
    id: u.id,
    email: u.email,
    twoFactorEnabled: u.twoFactorEnabled,
    user_metadata: {
      full_name: u.displayName ?? undefined,
      name: u.displayName ?? undefined,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await apiFetch('/api/auth/me', { method: 'GET' });
    if (me.ok) {
      const data = (await me.json()) as { user: ApiUser };
      setUser(mapUser(data.user));
    }
  }, []);

  const bootstrap = useCallback(async () => {
    authDebug('bootstrap_start', {
      path: window.location.pathname,
      search: window.location.search || '(empty)',
    });

    const tryMe = async (): Promise<boolean> => {
      const me = await apiFetch('/api/auth/me', { method: 'GET' });
      authDebug('bootstrap_me_response', { status: me.status, ok: me.ok });
      if (!me.ok) return false;
      const data = (await me.json()) as { user: ApiUser };
      setUser(mapUser(data.user));
      return true;
    };

    const tryRefresh = async (): Promise<boolean> => {
      const r = await fetchRefreshSessionDeduped();
      authDebug('bootstrap_refresh_response', { status: r.status, ok: r.ok });
      if (r.status === 204) return false;
      if (!r.ok) return false;
      const data = (await r.json()) as { user: ApiUser };
      setUser(mapUser(data.user));
      return true;
    };

    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');

    if (oauth === 'success') {
      authDebug('bootstrap_oauth_success_branch', {});
      const path = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', path);
      if (await tryMe()) {
        authDebug('bootstrap_oauth_success_done', { via: 'me' });
        setLoading(false);
        return;
      }
      if (await tryRefresh()) {
        authDebug('bootstrap_oauth_success_done', { via: 'refresh' });
        setLoading(false);
        return;
      }
      setUser(null);
      setLoading(false);
      authDebug('bootstrap_oauth_success_done', { sessionRestored: false });
      return;
    }

    if (oauth === 'error') {
      authDebug('bootstrap_oauth_error_query', {});
      const path = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', path);
    }

    if (await tryMe()) {
      setLoading(false);
      authDebug('bootstrap_done', { via: 'me' });
      return;
    }
    if (await tryRefresh()) {
      setLoading(false);
      authDebug('bootstrap_done', { via: 'refresh' });
      return;
    }

    setUser(null);
    setLoading(false);
    authDebug('bootstrap_done', { user: null });
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const signIn = async (email: string, password: string) => {
    const r = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await r.json().catch(() => ({}))) as {
      requiresTwoFactor?: boolean;
      error?: string;
      user?: ApiUser;
    };
    if (r.status === 200 && data.requiresTwoFactor === true) {
      return '2fa_required' as const;
    }
    if (!r.ok) {
      throw new Error(data.error ?? 'Sign in failed');
    }
    if (data.user) {
      setUser(mapUser(data.user));
    }
    return 'ok' as const;
  };

  const verifyTwoFactor = async (code: string) => {
    const r = await apiFetch('/api/auth/2fa/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = (await r.json().catch(() => ({}))) as { error?: string; user?: ApiUser };
    if (!r.ok) {
      throw new Error(data.error ?? 'Verification failed');
    }
    if (data.user) {
      setUser(mapUser(data.user));
    }
  };

  const signUp = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? 'Registration failed');
    }
    const data = (await res.json()) as { user: ApiUser };
    setUser(mapUser(data.user));
  };

  const signInWithOAuth = async (provider: OAuthProvider) => {
    authDebug('signInWithOAuth', { provider });
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  const signOut = async () => {
    authDebug('signOut_request', {});
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    authDebug('signOut_done', {});
  };

  const logoutAllDevices = async () => {
    const r = await apiFetch('/api/auth/logout-all', { method: 'POST' });
    if (!r.ok) {
      const err = (await r.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? 'Could not sign out all devices');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        verifyTwoFactor,
        signUp,
        signInWithOAuth,
        signOut,
        logoutAllDevices,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
