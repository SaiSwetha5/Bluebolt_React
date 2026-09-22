import type { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

/**
 * Section 8.1: "the SPA redirects to the IdP ... using the
 * authorization-code-with-PKCE flow, stores the resulting access token
 * in memory for the 15-minute TTL, and silently refreshes using the
 * 8-hour refresh token" (Section 8.1, tying back to Section 3's realm
 * asset360-prod).
 *
 * userStore uses an in-memory WebStorageStateStore (a plain object, not
 * window.localStorage/sessionStorage) — tokens never touch persistent
 * browser storage, per the blueprint's non-functional expectation that
 * the client is not a security boundary and shouldn't hold long-lived
 * credentials on disk.
 */
/** Minimal Storage implementation backed by a plain object instead of a browser storage API. */
class InMemoryStore implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

export const oidcConfig: AuthProviderProps = {
  authority: import.meta.env.VITE_IDP_AUTHORITY, // e.g. https://idp.example.com/realms/asset360-prod
  client_id: import.meta.env.VITE_IDP_CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code", // authorization code flow
  scope: "openid profile",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: new InMemoryStore() }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
