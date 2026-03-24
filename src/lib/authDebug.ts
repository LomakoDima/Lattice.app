/**
 * Client-side auth bootstrap logging (no tokens).
 * Production: set VITE_AUTH_VERBOSE=1 in .env to enable. Disable in dev: VITE_AUTH_VERBOSE=0.
 */
function shouldLog(): boolean {
  if (import.meta.env.VITE_AUTH_VERBOSE === '0') return false;
  if (import.meta.env.VITE_AUTH_VERBOSE === '1') return true;
  return import.meta.env.DEV;
}

export function authDebug(event: string, detail?: Record<string, unknown>): void {
  if (!shouldLog()) return;
  if (detail && Object.keys(detail).length > 0) {
    console.log(`[nexus:auth:client] ${event}`, detail);
  } else {
    console.log(`[nexus:auth:client] ${event}`);
  }
}
