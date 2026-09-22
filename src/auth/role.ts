/**
 * Decodes the access token's payload to read the "role" claim for UI
 * purposes (Section 8.1: route/action guards; Section 8.3: "Frontend —
 * usability only, never a security boundary"). This is NOT a
 * verification step — the frontend never checks the token signature;
 * asset-api and asset-gateway do that. This only decides what to show.
 */
export function roleFromAccessToken(accessToken: string | undefined): string | null {
  if (!accessToken) return null;
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export const ROLES = {
  ASSET_MANAGER: "ASSET_MANAGER",
  FIELD_TECHNICIAN: "FIELD_TECHNICIAN",
  AUDITOR: "AUDITOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
