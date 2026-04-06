/**
 * Per-account password brute-force guard.
 *
 * Tracks failed login attempts by email (normalized). Blocks login after
 * MAX_ATTEMPTS failures within WINDOW_MS regardless of source IP.
 *
 * Currently in-memory (Map). For multi-instance / production deployments
 * replace the backing store with Redis or a DB table so counters survive
 * restarts and are shared across processes.
 *
 * TODO: migrate to Redis/DB for horizontal scaling.
 */

const MAX_ATTEMPTS = 7;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Entry {
  count: number;
  firstAttempt: number;
}

const store = new Map<string, Entry>();

function key(email: string): string {
  return email.trim().toLowerCase();
}

function getEntry(email: string): Entry | undefined {
  const k = key(email);
  const e = store.get(k);
  if (!e) return undefined;
  if (Date.now() - e.firstAttempt > WINDOW_MS) {
    store.delete(k);
    return undefined;
  }
  return e;
}

export function isLoginBlocked(email: string): boolean {
  const e = getEntry(email);
  return !!e && e.count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(email: string): void {
  const k = key(email);
  const e = getEntry(email);
  if (e) {
    e.count += 1;
  } else {
    store.set(k, { count: 1, firstAttempt: Date.now() });
  }
}

export function clearLoginFailures(email: string): void {
  store.delete(key(email));
}
