import { authDebug } from './authDebug';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Full URL for browser navigation (OAuth redirect). On Vercel you must set `VITE_API_URL` to the Render API
 * origin — relative `/api/...` would hit Vercel (no API) and break OAuth.
 */
export function apiAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/**
 * API requests use cookies for auth: httpOnly access + refresh tokens (not readable by JS).
 * Always send credentials so cookies reach the API (same-site / proxied).
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers: init?.headers,
  });
}

/** One in-flight refresh at a time (React Strict Mode double-mount would otherwise race). */
let refreshSessionPromise: Promise<Response> | null = null;

export async function fetchRefreshSessionDeduped(): Promise<Response> {
  if (!refreshSessionPromise) {
    authDebug('refresh_fetch_start', { url: `${API_BASE || '(same-origin)'}/api/auth/refresh` });
    const url = `${API_BASE}/api/auth/refresh`;
    refreshSessionPromise = fetch(url, {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      refreshSessionPromise = null;
    });
  } else {
    authDebug('refresh_fetch_deduped', { note: 'waiting on in-flight refresh (e.g. Strict Mode)' });
  }
  const response = await refreshSessionPromise;
  return response.clone();
}
