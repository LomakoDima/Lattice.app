/**
 * Per-user TOTP brute-force guard.
 *
 * Currently in-memory (Map). For multi-instance / production deployments
 * replace the backing store with Redis or a DB table so counters survive
 * restarts and are shared across processes.
 *
 * TODO: migrate to Redis/DB for horizontal scaling.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Entry {
  count: number;
  firstAttempt: number;
}

const store = new Map<string, Entry>();

function getEntry(userId: string): Entry | undefined {
  const e = store.get(userId);
  if (!e) return undefined;
  if (Date.now() - e.firstAttempt > WINDOW_MS) {
    store.delete(userId);
    return undefined;
  }
  return e;
}

export function isTotpBlocked(userId: string): boolean {
  const e = getEntry(userId);
  return !!e && e.count >= MAX_ATTEMPTS;
}

export function recordTotpFailure(userId: string): void {
  const e = getEntry(userId);
  if (e) {
    e.count += 1;
  } else {
    store.set(userId, { count: 1, firstAttempt: Date.now() });
  }
}

export function clearTotpFailures(userId: string): void {
  store.delete(userId);
}
