import type { JWTClaims } from "@inai-dev/types";

export function decodeJWTPayload(token: string): JWTClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeJWTPayload(token);
  if (!claims?.exp) return true;
  return Date.now() >= claims.exp * 1000;
}

export function getClaimsFromToken(token: string): JWTClaims | null {
  return decodeJWTPayload(token);
}
