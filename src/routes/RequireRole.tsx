import type { ReactNode } from "react";
import { useAuth } from "react-oidc-context";
import { roleFromAccessToken, type Role } from "../auth/role";

interface RequireRoleProps {
  allow: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Hides or disables UI actions the current role isn't permitted to take
 * (Section 8.1). Not a security boundary — asset-api enforces the real
 * rules server-side (Section 8.3) even if this component is bypassed.
 */
export function RequireRole({ allow, children, fallback = null }: RequireRoleProps) {
  const auth = useAuth();
  const role = roleFromAccessToken(auth.user?.access_token);
  if (!role || !allow.includes(role as Role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
