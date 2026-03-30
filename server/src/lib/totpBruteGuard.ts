/**
 * In-memory per-user TOTP failure counter.
 * Blocks after MAX_FAILURES failed attempts within WINDOW_MS.
 * Automatically resets on success or after window expiry.
 *
 * For multi-instance deployments, migrate this to Redis.
 */

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type Entry = { count: number; firstAt: number };
const store = new Map<string, Entry>();

export function recordTotpFailure(userId: string): void {
  const now = Date.now();
  const entry = store.get(userId);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    store.set(userId, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
}

export function isTotpBlocked(userId: string): boolean {
  const now = Date.now();
  const entry = store.get(userId);
  if (!entry) return false;
  if (now - entry.firstAt > WINDOW_MS) {
    store.delete(userId);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function clearTotpFailures(userId: string): void {
  store.delete(userId);
}
