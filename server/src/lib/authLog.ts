/**
 * Auth flow logging (no secrets, tokens, passwords, or raw cookies).
 * Enable in production: AUTH_VERBOSE=1. Disable in dev: AUTH_VERBOSE=0.
 */
function shouldLog(): boolean {
  return process.env.AUTH_VERBOSE === '1';
}

export function authLog(event: string, detail?: Record<string, unknown>): void {
  if (!shouldLog()) return;
  const ts = new Date().toISOString();
  if (detail && Object.keys(detail).length > 0) {
    console.log(`[nexus:auth] ${ts} ${event}`, detail);
  } else {
    console.log(`[nexus:auth] ${ts} ${event}`);
  }
}
