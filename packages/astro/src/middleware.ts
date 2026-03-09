import type { MiddlewareHandler } from "astro";
import type { AuthObject } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  getClaimsFromToken,
  isTokenExpired,
} from "@inai-dev/shared";

export interface InAIAstroMiddlewareConfig {
  publicRoutes?: string[];
  signInUrl?: string;
}

export function inaiAstroMiddleware(
  config: InAIAstroMiddlewareConfig = {},
): MiddlewareHandler {
  const { publicRoutes = [], signInUrl = "/login" } = config;

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

    const token = context.cookies.get(COOKIE_AUTH_TOKEN)?.value;

    if (!token || isTokenExpired(token)) {
      return context.redirect(
        `${signInUrl}?returnTo=${encodeURIComponent(pathname)}`,
      );
    }

    const claims = getClaimsFromToken(token);
    if (!claims) {
      return context.redirect(signInUrl);
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
