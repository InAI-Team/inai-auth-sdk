import type { JWTClaims, AuthObject } from "@inai-dev/types";
import { getClaimsFromToken, isTokenExpired } from "@inai-dev/shared";

export { getClaimsFromToken, isTokenExpired };

export function buildAuthObjectFromToken(token: string): AuthObject | null {
  if (isTokenExpired(token)) return null;

  const claims = getClaimsFromToken(token);
  if (!claims) return null;

  return buildAuthObjectFromClaims(claims, token);
}

export function buildAuthObjectFromClaims(
  claims: JWTClaims,
  token: string,
): AuthObject {
  const roles = claims.roles ?? [];
  const permissions = claims.permissions ?? [];

  return {
    userId: claims.sub,
    tenantId: claims.tenant_id,
    appId: claims.app_id ?? null,
    envId: claims.env_id ?? null,
    orgId: claims.org_id ?? null,
    orgRole: claims.org_role ?? null,
    sessionId: null,
    getToken: async () => token,
    has: (params: { role?: string; permission?: string }) => {
      if (params.role && roles.includes(params.role)) return true;
      if (params.permission && permissions.includes(params.permission))
        return true;
      return false;
    },
  };
}
