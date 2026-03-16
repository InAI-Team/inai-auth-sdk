import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AuthObject, TokenPair, UserResource, PlatformUserResource } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_S,
  SESSION_MAX_DURATION_MS,
  decodeJWTPayload,
} from "@inai-dev/shared";

export function getAuth(c: Context): AuthObject | null {
  return c.get("inaiAuth") ?? null;
}

export function getTokenFromContext(c: Context): string | null {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return getCookie(c, COOKIE_AUTH_TOKEN) ?? null;
}

export function getRefreshTokenFromContext(c: Context): string | null {
  return getCookie(c, COOKIE_REFRESH_TOKEN) ?? null;
}

export function setAuthCookies(
  c: Context,
  tokens: TokenPair,
  user: UserResource | PlatformUserResource,
  options?: { isNewSession?: boolean },
): void {
  const isProduction =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  const claims = decodeJWTPayload(tokens.access_token);
  const expiresAt = claims
    ? new Date(claims.exp * 1000).toISOString()
    : new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  setCookie(c, COOKIE_AUTH_TOKEN, tokens.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    path: "/",
    maxAge: tokens.expires_in,
  });

  setCookie(c, COOKIE_REFRESH_TOKEN, tokens.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  setCookie(
    c,
    COOKIE_AUTH_SESSION,
    JSON.stringify({
      user,
      expiresAt,
      permissions: claims?.permissions ?? [],
      orgId: claims?.org_id,
      orgRole: claims?.org_role,
      appId: claims?.app_id,
      envId: claims?.env_id,
    }),
    {
      httpOnly: false,
      secure: isProduction,
      sameSite: "Lax",
      path: "/",
      maxAge: tokens.expires_in,
    },
  );

  if (options?.isNewSession) {
    setCookie(c, COOKIE_SESSION_START, String(Date.now()), {
      httpOnly: false,
      secure: isProduction,
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_MAX_DURATION_S,
    });
  }
}

export function clearAuthCookies(c: Context): void {
  deleteCookie(c, COOKIE_AUTH_TOKEN, { path: "/" });
  deleteCookie(c, COOKIE_REFRESH_TOKEN, { path: "/" });
  deleteCookie(c, COOKIE_AUTH_SESSION, { path: "/" });
  deleteCookie(c, COOKIE_SESSION_START, { path: "/" });
}

export function isSessionExpired(c: Context): boolean {
  const raw = getCookie(c, COOKIE_SESSION_START);
  if (!raw) return false;
  const loginAt = Number(raw);
  if (isNaN(loginAt)) return true;
  return Date.now() - loginAt >= SESSION_MAX_DURATION_MS;
}
