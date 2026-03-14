import type { JWTClaims, AuthObject } from "@inai-dev/types";
import {
  getClaimsFromToken,
  isTokenExpired,
  decodeJWTHeader,
  verifyES256,
  JWKSClient,
} from "@inai-dev/shared";

export { getClaimsFromToken, isTokenExpired };

export async function buildAuthObjectFromToken(
  token: string,
  jwksClient: JWKSClient,
): Promise<AuthObject | null> {
  // Decode header to get kid
  const header = decodeJWTHeader(token);
  if (!header?.kid) return null;

  let publicKey: CryptoKey;
  try {
    publicKey = await jwksClient.getKey(header.kid);
  } catch {
    return null;
  }

  // Verify signature and expiration
  const claims = await verifyES256(token, publicKey);
  if (!claims) {
    // Signature failed with cached key — refetch once in case of key rotation
    jwksClient.invalidate();
    try {
      publicKey = await jwksClient.getKey(header.kid);
    } catch {
      return null;
    }
    const retryResult = await verifyES256(token, publicKey);
    if (!retryResult) return null;
    return buildAuthObjectFromClaims(retryResult, token);
  }

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
