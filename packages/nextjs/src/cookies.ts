import type { UserResource, PlatformUserResource, JWTClaims, TokenPair } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_AUTH_SESSION,
  decodeJWTPayload,
} from "@inai-dev/shared";

export {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_AUTH_SESSION,
} from "@inai-dev/shared";

export { isTokenExpired, getClaimsFromToken } from "@inai-dev/shared";

interface CookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
}

interface SessionData {
  user: UserResource | PlatformUserResource;
  expiresAt: string;
  permissions?: string[];
  orgId?: string;
  orgRole?: string;
  appId?: string;
  envId?: string;
}

export function setAuthCookies(
  cookieStore: CookieStore,
  tokens: TokenPair,
  user: UserResource | PlatformUserResource,
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const claims = decodeJWTPayload(tokens.access_token);
  const expiresAt = claims
    ? new Date(claims.exp * 1000).toISOString()
    : new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  cookieStore.set(COOKIE_AUTH_TOKEN, tokens.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });

  cookieStore.set(COOKIE_REFRESH_TOKEN, tokens.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  const sessionData: SessionData = {
    user,
    expiresAt,
    permissions: claims?.permissions ?? [],
    orgId: claims?.org_id,
    orgRole: claims?.org_role,
    appId: claims?.app_id,
    envId: claims?.env_id,
  };
  cookieStore.set(COOKIE_AUTH_SESSION, JSON.stringify(sessionData), {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });
}

export function clearAuthCookies(
  cookieStore: CookieStore,
): void {
  const opts = { path: "/", maxAge: 0 };
  cookieStore.set(COOKIE_AUTH_TOKEN, "", opts);
  cookieStore.set(COOKIE_REFRESH_TOKEN, "", opts);
  cookieStore.set(COOKIE_AUTH_SESSION, "", opts);
}

export function getAuthTokenFromCookies(
  cookieStore: CookieStore,
): string | null {
  return cookieStore.get(COOKIE_AUTH_TOKEN)?.value ?? null;
}

export function getRefreshTokenFromCookies(
  cookieStore: CookieStore,
): string | null {
  return cookieStore.get(COOKIE_REFRESH_TOKEN)?.value ?? null;
}

export function getSessionFromCookies(
  cookieStore: CookieStore,
): SessionData | null {
  const raw = cookieStore.get(COOKIE_AUTH_SESSION)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}
