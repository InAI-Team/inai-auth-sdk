import type { UserResource, PlatformUserResource, TokenPair } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_S,
  SESSION_MAX_DURATION_MS,
  decodeJWTPayload,
} from "@inai-dev/shared";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_SESSION_START,
} from "@inai-dev/shared";

export { isTokenExpired, getClaimsFromToken } from "@inai-dev/shared";

interface SessionData {
  user: UserResource | PlatformUserResource;
  expiresAt: number;
  permissions?: string[];
  orgId?: string;
  orgRole?: string;
  appId?: string;
  envId?: string;
}

interface SetAuthCookiesOptions {
  isNewSession?: boolean;
}

/**
 * Sets all auth-related cookies (access token, refresh token, session data).
 * Uses TanStack Start's `setCookie` from `@tanstack/react-start/server`.
 *
 * Must be called within a server context (server function, middleware, or route handler).
 *
 * @param tokens - The token pair from the auth API (access_token, refresh_token, expires_in).
 * @param user - The user resource to store in the session cookie.
 * @param options - Optional. Set `isNewSession: true` on login/register to track session duration.
 */
export function setAuthCookies(
  tokens: TokenPair,
  user: UserResource | PlatformUserResource,
  options?: SetAuthCookiesOptions,
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const claims = decodeJWTPayload(tokens.access_token);
  const expiresAt = claims
    ? claims.exp * 1000
    : Date.now() + tokens.expires_in * 1000;

  setCookie(COOKIE_AUTH_TOKEN, tokens.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });

  setCookie(COOKIE_REFRESH_TOKEN, tokens.refresh_token, {
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
  setCookie(COOKIE_AUTH_SESSION, JSON.stringify(sessionData), {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  if (options?.isNewSession) {
    setCookie(COOKIE_SESSION_START, String(Date.now()), {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_DURATION_S,
    });
  }
}

/**
 * Clears all auth-related cookies by setting them to empty with `maxAge: 0`.
 * Must be called within a server context.
 */
export function clearAuthCookies(): void {
  const opts = { path: "/", maxAge: 0 } as const;
  setCookie(COOKIE_AUTH_TOKEN, "", opts);
  setCookie(COOKIE_REFRESH_TOKEN, "", opts);
  setCookie(COOKIE_AUTH_SESSION, "", opts);
  setCookie(COOKIE_SESSION_START, "", opts);
}

/**
 * Checks whether the absolute session duration has been exceeded.
 * Returns `true` if the session started more than `SESSION_MAX_DURATION_MS` ago.
 * Returns `false` if no session start cookie exists (no active session).
 */
export function isSessionExpired(): boolean {
  const raw = getCookie(COOKIE_SESSION_START);
  if (!raw) return false;
  const loginAt = Number(raw);
  if (isNaN(loginAt)) return true;
  return Date.now() - loginAt >= SESSION_MAX_DURATION_MS;
}

/**
 * Reads the access token from the `COOKIE_AUTH_TOKEN` cookie.
 * @returns The access token string, or `null` if not present.
 */
export function getAuthTokenFromCookies(): string | null {
  // getCookie() returns string | undefined; coerce to null for SDK consistency
  return getCookie(COOKIE_AUTH_TOKEN) ?? null;
}

/**
 * Reads the refresh token from the `COOKIE_REFRESH_TOKEN` cookie.
 * @returns The refresh token string, or `null` if not present.
 */
export function getRefreshTokenFromCookies(): string | null {
  // getCookie() returns string | undefined; coerce to null for SDK consistency
  return getCookie(COOKIE_REFRESH_TOKEN) ?? null;
}

/**
 * Reads and parses the session data from the `COOKIE_AUTH_SESSION` cookie.
 * @returns The parsed session data (user, expiresAt, permissions, etc.), or `null` if not present or malformed.
 */
export function getSessionFromCookies(): SessionData | null {
  const raw = getCookie(COOKIE_AUTH_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}
