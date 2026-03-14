import type { Request, Response, NextFunction } from "express";
import type { InAIAuthConfig } from "@inai-dev/types";
import { InAIAuthClient, buildAuthObjectFromToken } from "@inai-dev/backend";
import { isTokenExpired, JWKSClient, DEFAULT_API_URL } from "@inai-dev/shared";
import type { InAIExpressMiddlewareConfig, RequireAuthConfig } from "./types";
import {
  getTokenFromRequest,
  getRefreshTokenFromRequest,
  setAuthCookies,
  clearAuthCookies,
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
  req: Request,
  publicRoutes: string[] | ((req: Request) => boolean),
): boolean {
  if (typeof publicRoutes === "function") return publicRoutes(req);
  return matchesRoute(req.path, publicRoutes);
}

export function inaiAuthMiddleware(
  config: InAIExpressMiddlewareConfig & InAIAuthConfig = {},
) {
  const {
    authMode = "app",
    publicRoutes = [],
    onUnauthorized,
    beforeAuth,
    afterAuth,
    ...authClientConfig
  } = config;

  const client = new InAIAuthClient(authClientConfig);
  const isPlatform = authMode === "platform";

  const jwksUrl = authClientConfig.jwksUrl
    ?? `${authClientConfig.apiUrl ?? DEFAULT_API_URL}/.well-known/jwks.json`;
  const jwksClient = new JWKSClient(jwksUrl);

  const defaultUnauthorized = (_req: Request, res: Response) => {
    res.status(401).json({ error: "Unauthorized" });
  };

  const handleUnauthorized = onUnauthorized ?? defaultUnauthorized;

  return async function middleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (beforeAuth) {
      const skip = beforeAuth(req, res);
      if (skip === true) {
        next();
        return;
      }
    }

    if (isPublicRoute(req, publicRoutes)) {
      req.auth = null;
      next();
      return;
    }

    const token = getTokenFromRequest(req);

    if (!token || isTokenExpired(token)) {
      const refreshToken = getRefreshTokenFromRequest(req);

      if (refreshToken) {
        try {
          const tokens = isPlatform
            ? await client.platformRefresh(refreshToken)
            : await client.refresh(refreshToken);
          const { data: user } = isPlatform
            ? await client.platformGetMe(tokens.access_token)
            : await client.getMe(tokens.access_token);
          setAuthCookies(res, tokens, user);

          const authObj = await buildAuthObjectFromToken(tokens.access_token, jwksClient);
          req.auth = authObj;

          if (authObj && afterAuth) {
            afterAuth(authObj, req, res);
          }

          next();
          return;
        } catch {
          clearAuthCookies(res);
          handleUnauthorized(req, res, next);
          return;
        }
      }

      handleUnauthorized(req, res, next);
      return;
    }

    const authObj = await buildAuthObjectFromToken(token, jwksClient);
    if (!authObj) {
      handleUnauthorized(req, res, next);
      return;
    }

    req.auth = authObj;

    if (afterAuth) {
      afterAuth(authObj, req, res);
    }

    next();
  };
}

export function requireAuth(config: RequireAuthConfig = {}) {
  return function middleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!req.auth?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (config.role || config.permission) {
      const hasAccess = req.auth.has({
        role: config.role,
        permission: config.permission,
      });

      if (!hasAccess) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    next();
  };
}
