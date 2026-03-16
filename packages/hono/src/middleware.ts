import type { MiddlewareHandler } from "hono";
import type { InAIAuthConfig } from "@inai-dev/types";
import { InAIAuthClient, buildAuthObjectFromToken } from "@inai-dev/backend";
import { isTokenExpired, JWKSClient, DEFAULT_API_URL } from "@inai-dev/shared";
import type { InAIHonoMiddlewareConfig, RequireAuthConfig } from "./types";
import {
  getTokenFromContext,
  getRefreshTokenFromContext,
  setAuthCookies,
  clearAuthCookies,
  isSessionExpired,
  getAuth,
} from "./helpers";

function matchesRoute(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("*")) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern;
  });
}

function isPublicRoute(
  path: string,
  publicRoutes: string[] | ((path: string) => boolean),
): boolean {
  if (typeof publicRoutes === "function") return publicRoutes(path);
  return matchesRoute(path, publicRoutes);
}

export function inaiAuthMiddleware(
  config: InAIHonoMiddlewareConfig & InAIAuthConfig = {},
): MiddlewareHandler {
  const {
    authMode = "app",
    publicRoutes = [],
    onUnauthorized,
    ...authClientConfig
  } = config;

  const client = new InAIAuthClient(authClientConfig);
  const isPlatform = authMode === "platform";

  const jwksUrl = authClientConfig.jwksUrl
    ?? `${authClientConfig.apiUrl ?? DEFAULT_API_URL}/.well-known/jwks.json`;
  const jwksClient = new JWKSClient(jwksUrl);

  const defaultUnauthorized = (c: Parameters<MiddlewareHandler>[0]) =>
    c.json({ error: "Unauthorized" }, 401);

  const handleUnauthorized = onUnauthorized ?? defaultUnauthorized;

  return async function middleware(c, next) {
    const path = new URL(c.req.url).pathname;

    if (isPublicRoute(path, publicRoutes)) {
      c.set("inaiAuth", null);
      await next();
      return;
    }

    const token = getTokenFromContext(c);

    if (!token || isTokenExpired(token)) {
      // Check absolute session max before attempting refresh
      if (isSessionExpired(c)) {
        clearAuthCookies(c);
        return handleUnauthorized(c);
      }

      const refreshToken = getRefreshTokenFromContext(c);

      if (refreshToken) {
        try {
          const tokens = isPlatform
            ? await client.platformRefresh(refreshToken)
            : await client.refresh(refreshToken);
          const { data: user } = isPlatform
            ? await client.platformGetMe(tokens.access_token)
            : await client.getMe(tokens.access_token);
          setAuthCookies(c, tokens, user);

          const authObj = await buildAuthObjectFromToken(tokens.access_token, jwksClient);
          c.set("inaiAuth", authObj);

          await next();
          return;
        } catch {
          clearAuthCookies(c);
          return handleUnauthorized(c);
        }
      }

      return handleUnauthorized(c);
    }

    const authObj = await buildAuthObjectFromToken(token, jwksClient);
    if (!authObj) {
      return handleUnauthorized(c);
    }

    c.set("inaiAuth", authObj);
    await next();
  };
}

export function requireAuth(config: RequireAuthConfig = {}): MiddlewareHandler {
  return async function middleware(c, next) {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (config.role || config.permission) {
      const hasAccess = auth.has({
        role: config.role,
        permission: config.permission,
      });

      if (!hasAccess) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    await next();
  };
}
