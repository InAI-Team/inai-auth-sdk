import { InAIAuthClient } from "@inai-dev/backend";
import type { InAIAuthConfig, TokenPair, PlatformUserResource } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_REFRESH_TOKEN,
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_S,
} from "@inai-dev/shared";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { isSessionExpired } from "./cookies";

/**
 * Creates auth route handlers for **platform/admin** authentication flows.
 *
 * Returns a `handleRequest(request, path)` function that dispatches to the
 * appropriate handler based on the URL path segment.
 *
 * Supported paths:
 * - POST: `login`, `register`, `mfa-challenge`, `refresh`, `logout`
 * - GET: `me`
 *
 * @param config - InAI Auth client configuration (apiUrl, publishableKey, etc.).
 *
 * @example
 * ```ts
 * // routes/api/platform/auth/$path.ts
 * import { createAPIFileRoute } from "@tanstack/react-start/api"
 * import { createPlatformAuthRouteHandlers } from "@inai-dev/tanstack-start/server"
 *
 * const { handleRequest } = createPlatformAuthRouteHandlers()
 *
 * export const APIRoute = createAPIFileRoute("/api/platform/auth/$path")({
 *   GET: ({ request, params }) => handleRequest(request, params.path),
 *   POST: ({ request, params }) => handleRequest(request, params.path),
 * })
 * ```
 */
export function createPlatformAuthRouteHandlers(config: InAIAuthConfig = {}) {
  const client = new InAIAuthClient(config);
  const isProduction = process.env.NODE_ENV === "production";

  function setPlatformCookies(
    tokens: TokenPair,
    user?: PlatformUserResource,
    options?: { isNewSession?: boolean },
  ) {
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
    if (user) {
      const expiresAt = Date.now() + tokens.expires_in * 1000;
      setCookie(
        COOKIE_AUTH_SESSION,
        JSON.stringify({ user, expiresAt }),
        {
          httpOnly: false,
          secure: isProduction,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        },
      );
    }
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

  function clearPlatformCookies() {
    const opts = { path: "/", maxAge: 0 } as const;
    setCookie(COOKIE_AUTH_TOKEN, "", opts);
    setCookie(COOKIE_REFRESH_TOKEN, "", opts);
    setCookie(COOKIE_AUTH_SESSION, "", opts);
    setCookie(COOKIE_SESSION_START, "", opts);
  }

  async function handleLogin(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const result = await client.platformLogin({
        email: body.email,
        password: body.password,
      });

      if (result.mfa_required) {
        return Response.json({
          mfa_required: true,
          mfa_token: result.mfa_token,
        });
      }

      const tokens = {
        access_token: result.access_token!,
        refresh_token: result.refresh_token!,
        token_type: result.token_type!,
        expires_in: result.expires_in!,
      };
      const user = result.user;
      setPlatformCookies(tokens, user, { isNewSession: true });

      return Response.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return Response.json({ error: message }, { status: 401 });
    }
  }

  async function handleMFAChallenge(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const result = await client.platformMfaChallenge({
        mfa_token: body.mfa_token,
        code: body.code,
      });

      const tokens = {
        access_token: result.access_token!,
        refresh_token: result.refresh_token!,
        token_type: result.token_type!,
        expires_in: result.expires_in!,
      };
      const user = result.user;
      setPlatformCookies(tokens, user, { isNewSession: true });

      return Response.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "MFA verification failed";
      return Response.json({ error: message }, { status: 401 });
    }
  }

  async function handleRefresh(): Promise<Response> {
    try {
      if (isSessionExpired()) {
        clearPlatformCookies();
        return Response.json({ error: "Session expired" }, { status: 401 });
      }

      const refreshToken = getCookie(COOKIE_REFRESH_TOKEN);
      if (!refreshToken) {
        clearPlatformCookies();
        return Response.json({ error: "No refresh token" }, { status: 401 });
      }

      const tokens = await client.platformRefresh(refreshToken);
      const { data: user } = await client.platformGetMe(tokens.access_token);
      setPlatformCookies(tokens, user);

      return Response.json({ user });
    } catch {
      clearPlatformCookies();
      return Response.json({ error: "Refresh failed" }, { status: 401 });
    }
  }

  async function handleLogout(): Promise<Response> {
    try {
      const accessToken = getCookie(COOKIE_AUTH_TOKEN);
      if (accessToken) {
        await client.platformLogout(accessToken).catch(() => {});
      }
      clearPlatformCookies();
      return Response.json({ success: true });
    } catch {
      clearPlatformCookies();
      return Response.json({ success: true });
    }
  }

  async function handleGetMe(): Promise<Response> {
    try {
      const accessToken = getCookie(COOKIE_AUTH_TOKEN);
      if (!accessToken) {
        return Response.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }
      const result = await client.platformGetMe(accessToken);
      return Response.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get user";
      return Response.json({ error: message }, { status: 401 });
    }
  }

  async function handleRegister(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const result = await client.platformRegister({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        tenantName: body.tenantName,
        tenantSlug: body.tenantSlug,
      });

      if (result.access_token && result.refresh_token) {
        const tokens = {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          token_type: result.token_type!,
          expires_in: result.expires_in!,
        };
        setPlatformCookies(tokens, result.user, { isNewSession: true });
      }

      return Response.json({ user: result.user, tenant: result.tenant });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  async function handleRequest(
    request: Request,
    path: string,
  ): Promise<Response> {
    if (request.method === "POST") {
      switch (path) {
        case "login":
          return handleLogin(request);
        case "register":
          return handleRegister(request);
        case "mfa-challenge":
          return handleMFAChallenge(request);
        case "refresh":
          return handleRefresh();
        case "logout":
          return handleLogout();
      }
    }

    if (request.method === "GET") {
      switch (path) {
        case "me":
          return handleGetMe();
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return { handleRequest };
}
