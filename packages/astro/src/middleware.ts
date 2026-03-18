import type { MiddlewareHandler } from "astro";
import { buildAuthObjectFromToken } from "@inai-dev/backend";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_REFRESH_TOKEN,
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_MS,
  isTokenExpired,
  JWKSClient,
  DEFAULT_API_URL,
} from "@inai-dev/shared";

export interface InAIAstroMiddlewareConfig {
  publicRoutes?: string[];
  signInUrl?: string;
  jwksUrl?: string;
  apiUrl?: string;
}

export function inaiAstroMiddleware(
  config: InAIAstroMiddlewareConfig = {},
): MiddlewareHandler {
  const { publicRoutes = [], signInUrl = "/login" } = config;

  const jwksUrl = config.jwksUrl
    ?? `${config.apiUrl ?? DEFAULT_API_URL}/.well-known/jwks.json`;
  const jwksClient = new JWKSClient(jwksUrl);

  return async (context, next) => {
    const { pathname } = context.url;

    const isPublic =
      publicRoutes.some((route) => {
        if (route.endsWith("*")) {
          return pathname.startsWith(route.slice(0, -1));
        }
        return pathname === route;
      }) ||
      pathname === signInUrl ||
      pathname.startsWith("/_") ||
      pathname.startsWith("/api/");

    if (isPublic) {
      return next();
    }

    let token = context.cookies.get(COOKIE_AUTH_TOKEN)?.value;

    if (!token || isTokenExpired(token)) {
      // Check absolute session max before attempting refresh
      const sessionStartRaw = context.cookies.get(COOKIE_SESSION_START)?.value;
      if (sessionStartRaw) {
        const loginAt = Number(sessionStartRaw);
        if (!isNaN(loginAt) && Date.now() - loginAt >= SESSION_MAX_DURATION_MS) {
          context.cookies.delete(COOKIE_AUTH_TOKEN, { path: "/" });
          context.cookies.delete(COOKIE_REFRESH_TOKEN, { path: "/" });
          context.cookies.delete(COOKIE_AUTH_SESSION, { path: "/" });
          context.cookies.delete(COOKIE_SESSION_START, { path: "/" });
          return context.redirect(
            `${signInUrl}?returnTo=${encodeURIComponent(pathname)}`,
          );
        }
      }

      const refreshToken = context.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
      if (refreshToken) {
        try {
          const refreshUrl = new URL("/api/auth/refresh", context.url.origin);
          const refreshRes = await fetch(refreshUrl.toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: context.request.headers.get("cookie") ?? "",
            },
          });
          if (refreshRes.ok) {
            const setCookies = refreshRes.headers.getSetCookie?.() ?? [];
            const response = await next();
            for (const cookie of setCookies) {
              response.headers.append("Set-Cookie", cookie);
            }
            return response;
          }
        } catch {
          // Refresh failed, redirect to sign-in
        }
      }

      return context.redirect(
        `${signInUrl}?returnTo=${encodeURIComponent(pathname)}`,
      );
    }

    const authObject = await buildAuthObjectFromToken(token, jwksClient);
    if (!authObject) {
      return context.redirect(`${signInUrl}?returnTo=${encodeURIComponent(pathname)}`);
    }

    (context.locals as Record<string, unknown>).auth = authObject;

    return next();
  };
}
