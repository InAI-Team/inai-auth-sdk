import type { Request, Response } from "express";
import type { AuthObject, TokenPair, UserResource, PlatformUserResource } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_AUTH_SESSION,
  decodeJWTPayload,
} from "@inai-dev/shared";

export function getAuth(req: Request): AuthObject | null {
  return req.auth ?? null;
}

export function parseCookiesFromHeader(
  header: string | undefined,
): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  if (req.cookies?.[COOKIE_AUTH_TOKEN]) {
    return req.cookies[COOKIE_AUTH_TOKEN];
  }

  const parsed = parseCookiesFromHeader(req.headers.cookie);
  return parsed[COOKIE_AUTH_TOKEN] ?? null;
}

export function getRefreshTokenFromRequest(req: Request): string | null {
  if (req.cookies?.[COOKIE_REFRESH_TOKEN]) {
    return req.cookies[COOKIE_REFRESH_TOKEN];
  }

  const parsed = parseCookiesFromHeader(req.headers.cookie);
  return parsed[COOKIE_REFRESH_TOKEN] ?? null;
}

export function setAuthCookies(
  res: Response,
  tokens: TokenPair,
  user: UserResource | PlatformUserResource,
): void {
  const isProduction =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  const claims = decodeJWTPayload(tokens.access_token);
  const expiresAt = claims
    ? new Date(claims.exp * 1000).toISOString()
    : new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Express res.cookie maxAge is in milliseconds
  res.cookie(COOKIE_AUTH_TOKEN, tokens.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in * 1000, // expires_in is in seconds, Express expects ms
  });

  res.cookie(COOKIE_REFRESH_TOKEN, tokens.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  res.cookie(
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
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in * 1000, // expires_in is in seconds, Express expects ms
    },
  );
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_AUTH_TOKEN, { path: "/" });
  res.clearCookie(COOKIE_REFRESH_TOKEN, { path: "/api/auth" });
  res.clearCookie(COOKIE_AUTH_SESSION, { path: "/" });
}
