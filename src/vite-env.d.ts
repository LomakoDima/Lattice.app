/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_REDIRECT_URL?: string;
  /** Optional API origin; leave unset in dev to use Vite proxy (`/api` → backend). */
  readonly VITE_API_URL?: string;
}
