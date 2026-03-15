import type { MiddlewareHandler } from "astro";
import type { AuthObject } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  decodeJWTHeader,
  verifyES256,
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

    // Verify token signature with JWKS
    const header = decodeJWTHeader(token);
    if (!header?.kid) {
      return context.redirect(`${signInUrl}?returnTo=${encodeURIComponent(pathname)}`);
    }

    let publicKey: CryptoKey;
    try {
      publicKey = await jwksClient.getKey(header.kid);
    } catch {
      return context.redirect(`${signInUrl}?returnTo=${encodeURIComponent(pathname)}`);
    }

    let claims = await verifyES256(token, publicKey);
    if (!claims) {
      // Signature failed with cached key — refetch once in case of key rotation
      jwksClient.invalidate();
      try {
        publicKey = await jwksClient.getKey(header.kid);
      } catch {
        return context.redirect(`${signInUrl}?returnTo=${encodeURIComponent(pathname)}`);
      }
      claims = await verifyES256(token, publicKey);
      if (!claims) {
        return context.redirect(`${signInUrl}?returnTo=${encodeURIComponent(pathname)}`);
      }
    }

    const roles = claims.roles ?? [];
    const permissions = claims.permissions ?? [];

    const authObject: AuthObject = {
      userId: claims.sub,
      tenantId: claims.tenant_id,
      appId: claims.app_id ?? null,
      envId: claims.env_id ?? null,
      orgId: claims.org_id ?? null,
      orgRole: claims.org_role ?? null,
      sessionId: null,
      roles,
      permissions,
      getToken: async () => token,
      has: (params: { role?: string; permission?: string }) => {
        if (params.role && roles.includes(params.role)) return true;
        if (params.permission && permissions.includes(params.permission))
          return true;
        return false;
      },
    };

    (context.locals as Record<string, unknown>).auth = authObject;

    return next();
  };
}
