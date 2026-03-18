import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import type { AuthObject } from "@inai-dev/types";
import { buildAuthObjectFromToken, InAIAuthClient } from "@inai-dev/backend";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_REFRESH_TOKEN,
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_MS,
  DEFAULT_API_URL,
  isTokenExpired,
  JWKSClient,
} from "@inai-dev/shared";
import type { InAITanStackMiddlewareConfig, RequireAuthConfig } from "./types";

// Module-level JWKS client singleton (shared across requests in the same process)
let sharedJwksClient: JWKSClient | null = null;
let sharedJwksUrl: string | null = null;

function getJwksClient(config: InAITanStackMiddlewareConfig): JWKSClient {
  const jwksUrl =
    config.jwksUrl ??
    `${config.apiUrl ?? DEFAULT_API_URL}/.well-known/jwks.json`;

  if (!sharedJwksClient || sharedJwksUrl !== jwksUrl) {
    sharedJwksClient = new JWKSClient(jwksUrl);
    sharedJwksUrl = jwksUrl;
  }
  return sharedJwksClient;
}

/**
 * Creates a route matcher function from an array of string/RegExp patterns.
 * Useful for building custom `publicRoutes` callbacks.
 *
 * @example
 * ```ts
 * const isPublic = createRouteMatcher(["/login", "/register", "/api/*"])
 * const middleware = createInAIAuthMiddleware({
 *   publicRoutes: isPublic,
 * })
 * ```
 */
export function createRouteMatcher(
  patterns: (string | RegExp)[],
): (pathname: string) => boolean {
  const matchers = patterns.map((pattern) => {
    if (pattern instanceof RegExp) return pattern;
    let regexStr = pattern;
    if (regexStr.endsWith("*") && !regexStr.includes("(")) {
      regexStr = regexStr.slice(0, -1) + ".*";
    }
    return new RegExp(`^${regexStr}$`);
  });

  return (pathname: string) => matchers.some((m) => m.test(pathname));
}

function matchesRoute(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("*")) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern;
  });
}

function isPublicRoute(
  pathname: string,
  publicRoutes: string[] | ((pathname: string) => boolean),
  builtinPublic: string[],
): boolean {
  if (matchesRoute(pathname, builtinPublic)) return true;
  if (typeof publicRoutes === "function") return publicRoutes(pathname);
  return matchesRoute(pathname, publicRoutes);
}

function clearAllCookies(): void {
  const opts = { path: "/", maxAge: 0 } as const;
  setCookie(COOKIE_AUTH_TOKEN, "", opts);
  setCookie(COOKIE_REFRESH_TOKEN, "", opts);
  setCookie(COOKIE_AUTH_SESSION, "", opts);
  setCookie(COOKIE_SESSION_START, "", opts);
}

/**
 * Attempts to refresh tokens using the refresh token.
 * Returns the new access token string on success, or null on failure.
 *
 * For **platform mode**, calls the platform API directly.
 * For **app mode**, uses InAIAuthClient to call the configured API.
 */
async function refreshTokens(
  refreshToken: string,
  config: InAITanStackMiddlewareConfig,
): Promise<string | null> {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    const authMode = config.authMode ?? "app";

    if (authMode === "platform") {
      // Platform mode: direct API call to platform endpoints
      const refreshRes = await fetch(
        `${apiUrl}/api/platform/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
      );
      if (!refreshRes.ok) return null;

      const newTokens = (await refreshRes.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      const meRes = await fetch(`${apiUrl}/api/platform/auth/me`, {
        headers: { Authorization: `Bearer ${newTokens.access_token}` },
      });
      if (!meRes.ok) return null;

      const meData = (await meRes.json()) as { data?: unknown };
      const newUser = meData.data ?? meData;

      setCookie(COOKIE_AUTH_TOKEN, newTokens.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: newTokens.expires_in,
      });
      setCookie(COOKIE_REFRESH_TOKEN, newTokens.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
      setCookie(
        COOKIE_AUTH_SESSION,
        JSON.stringify({
          user: newUser,
          expiresAt: Date.now() + newTokens.expires_in * 1000,
        }),
        {
          httpOnly: false,
          secure: isProduction,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        },
      );

      return newTokens.access_token;
    }

    // App mode: use InAIAuthClient to refresh directly
    const client = new InAIAuthClient({ apiUrl });
    const newTokens = await client.refresh(refreshToken);
    const { data: user } = await client.getMe(newTokens.access_token);

    setCookie(COOKIE_AUTH_TOKEN, newTokens.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: newTokens.expires_in,
    });
    setCookie(COOKIE_REFRESH_TOKEN, newTokens.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    setCookie(
      COOKIE_AUTH_SESSION,
      JSON.stringify({
        user,
        expiresAt: Date.now() + newTokens.expires_in * 1000,
      }),
      {
        httpOnly: false,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      },
    );

    return newTokens.access_token;
  } catch {
    return null;
  }
}

/**
 * Request-level middleware for TanStack Start.
 *
 * Runs on **every** server request (SSR, API routes, server functions).
 * Verifies the JWT access token via JWKS, attempts silent refresh when expired,
 * and injects `{ auth: AuthObject | null }` into the middleware context.
 *
 * @param config - Middleware configuration options.
 * @param config.authMode - `"app"` (default) or `"platform"` auth mode.
 * @param config.publicRoutes - Routes that skip auth. Array of glob strings or a predicate function.
 * @param config.signInUrl - URL to redirect unauthenticated users to. Defaults to `"/login"`.
 * @param config.onUnauthorized - `"redirect"` (default) sends to signInUrl; `"null"` passes `auth: null` to context.
 * @param config.apiUrl - InAI Auth API URL. Defaults to `https://apiauth.inai.dev`.
 * @param config.jwksUrl - Custom JWKS endpoint URL.
 *
 * @example
 * ```ts
 * // app/ssr.tsx
 * import { createStart } from "@tanstack/react-start"
 * import { createInAIAuthMiddleware } from "@inai-dev/tanstack-start/middleware"
 *
 * const authMiddleware = createInAIAuthMiddleware({
 *   publicRoutes: ["/", "/login", "/register", "/api/*"],
 *   signInUrl: "/login",
 * })
 *
 * export default createStart({
 *   requestMiddleware: [authMiddleware],
 * })
 * ```
 */
export function createInAIAuthMiddleware(
  config: InAITanStackMiddlewareConfig = {},
) {
  const {
    publicRoutes = [],
    signInUrl = "/login",
    onUnauthorized = "redirect",
    beforeAuth,
    afterAuth,
  } = config;

  const builtinPublic = ["/api/*", signInUrl];
  const jwksClient = getJwksClient(config);

  return createMiddleware().server(
    async ({ next, request }) => {
      // beforeAuth hook — run before any auth logic
      if (beforeAuth) {
        const result = beforeAuth(request);
        if (result) throw result;
      }

      const pathname = new URL(request.url).pathname;

      // Allow public routes through without auth check
      if (isPublicRoute(pathname, publicRoutes, builtinPublic)) {
        return next({ context: { auth: null as AuthObject | null } });
      }

      const token = getCookie(COOKIE_AUTH_TOKEN);

      if (!token || isTokenExpired(token)) {
        // Check absolute session max before attempting refresh
        const sessionStart = getCookie(COOKIE_SESSION_START);
        if (sessionStart) {
          const loginAt = Number(sessionStart);
          if (
            !isNaN(loginAt) &&
            Date.now() - loginAt >= SESSION_MAX_DURATION_MS
          ) {
            clearAllCookies();
            if (onUnauthorized === "redirect") {
              throw redirect({
                to: signInUrl,
                search: { returnTo: pathname },
              });
            }
            return next({ context: { auth: null as AuthObject | null } });
          }
        }

        // Attempt silent token refresh
        const refreshToken = getCookie(COOKIE_REFRESH_TOKEN);
        if (refreshToken) {
          const newAccessToken = await refreshTokens(refreshToken, config);
          if (newAccessToken) {
            // Build auth object directly from the token we just received
            // (avoids read-after-write issues with getCookie)
            const authObj = await buildAuthObjectFromToken(
              newAccessToken,
              jwksClient,
            );
            if (authObj && afterAuth) {
              const result = afterAuth(authObj, request);
              if (result) throw result;
            }
            return next({ context: { auth: authObj } });
          }
        }

        // No token or refresh failed
        clearAllCookies();
        if (onUnauthorized === "redirect") {
          throw redirect({
            to: signInUrl,
            search: { returnTo: pathname },
          });
        }
        return next({ context: { auth: null as AuthObject | null } });
      }

      // Valid non-expired token — verify signature with JWKS
      const authObj = await buildAuthObjectFromToken(token, jwksClient);
      if (!authObj) {
        clearAllCookies();
        if (onUnauthorized === "redirect") {
          throw redirect({ to: signInUrl });
        }
        return next({ context: { auth: null as AuthObject | null } });
      }

      // afterAuth hook — run after successful auth verification
      if (afterAuth) {
        const result = afterAuth(authObj, request);
        if (result) throw result;
      }

      return next({ context: { auth: authObj as AuthObject | null } });
    },
  );
}

/**
 * Server function middleware for TanStack Start.
 *
 * Designed for use with `createServerFn().middleware([...])`.
 * **Never redirects** — always sets `auth: null` if the user is not authenticated,
 * allowing the server function to decide the response.
 *
 * @param config - Optional middleware configuration (apiUrl, jwksUrl).
 *
 * @example
 * ```ts
 * import { createServerFn } from "@tanstack/react-start"
 * import { createInAIAuthFnMiddleware } from "@inai-dev/tanstack-start/middleware"
 *
 * const authFnMiddleware = createInAIAuthFnMiddleware()
 *
 * const getProfile = createServerFn({ method: "GET" })
 *   .middleware([authFnMiddleware])
 *   .handler(({ context }) => {
 *     if (!context.auth) throw new Error("Not authenticated")
 *     return fetchProfile(context.auth.userId)
 *   })
 * ```
 */
export function createInAIAuthFnMiddleware(
  config: InAITanStackMiddlewareConfig = {},
) {
  const jwksClient = getJwksClient(config);

  return createMiddleware({ type: "function" }).server(
    async ({ next }) => {
      const token = getCookie(COOKIE_AUTH_TOKEN);

      if (!token || isTokenExpired(token)) {
        return next({ context: { auth: null as AuthObject | null } });
      }

      const authObj = await buildAuthObjectFromToken(token, jwksClient);
      return next({ context: { auth: authObj as AuthObject | null } });
    },
  );
}

/**
 * Guard middleware that requires authentication.
 *
 * Throws a JSON error response (401/403) if the user is not authenticated
 * or lacks the required role/permission. Use after `createInAIAuthFnMiddleware`
 * in the middleware chain.
 *
 * @param config - Optional role/permission requirements.
 * @param config.role - Required role name.
 * @param config.permission - Required permission name.
 *
 * @example
 * ```ts
 * import { createServerFn } from "@tanstack/react-start"
 * import {
 *   createInAIAuthFnMiddleware,
 *   requireAuth,
 * } from "@inai-dev/tanstack-start/middleware"
 *
 * const authFn = createInAIAuthFnMiddleware()
 *
 * const adminAction = createServerFn({ method: "POST" })
 *   .middleware([authFn, requireAuth({ role: "admin" })])
 *   .handler(({ context }) => {
 *     // context.auth is guaranteed to be non-null with "admin" role
 *     return performAdminAction(context.auth.userId)
 *   })
 * ```
 */
export function requireAuth(config?: RequireAuthConfig) {
  return createMiddleware({ type: "function" }).server(
    ({ next, context }) => {
      const auth = (context as unknown as { auth?: AuthObject | null }).auth;

      if (!auth) {
        throw new Error("Unauthorized");
      }

      if (config?.role && !auth.has({ role: config.role })) {
        throw new Error("Forbidden: insufficient role");
      }

      if (config?.permission && !auth.has({ permission: config.permission })) {
        throw new Error("Forbidden: insufficient permission");
      }

      return next({ context: { auth } });
    },
  );
}
