import { InAIAuthClient } from "@inai-dev/backend";
import type { InAIAuthConfig, UserResource } from "@inai-dev/types";
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromCookies,
  isSessionExpired,
} from "./cookies";

/**
 * Creates auth route handlers for **app user** authentication flows.
 *
 * Returns a `handleRequest(request, path)` function that dispatches to the
 * appropriate handler based on the URL path segment.
 *
 * Supported paths (POST): `login`, `register`, `mfa-challenge`, `refresh`,
 * `logout`, `forgot-password`, `reset-password`, `verify-email`.
 *
 * @param config - InAI Auth client configuration (apiUrl, publishableKey, etc.).
 *
 * @example
 * ```ts
 * // routes/api/auth/$path.ts
 * import { createAPIFileRoute } from "@tanstack/react-start/api"
 * import { createAuthRouteHandlers } from "@inai-dev/tanstack-start/server"
 *
 * const { handleRequest } = createAuthRouteHandlers()
 *
 * export const APIRoute = createAPIFileRoute("/api/auth/$path")({
 *   POST: ({ request, params }) => handleRequest(request, params.path),
 * })
 * ```
 */
export function createAuthRouteHandlers(config: InAIAuthConfig = {}) {
  const client = new InAIAuthClient(config);

  async function handleLogin(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const result = await client.login({
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
      const user =
        (result.user as UserResource) ??
        (await client.getMe(tokens.access_token)).data;
      setAuthCookies(tokens, user, { isNewSession: true });

      return Response.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return Response.json({ error: message }, { status: 401 });
    }
  }

  async function handleMFAChallenge(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const tokens = await client.mfaChallenge({
        mfa_token: body.mfa_token,
        code: body.code,
      });

      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(tokens, user, { isNewSession: true });

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
        clearAuthCookies();
        return Response.json({ error: "Session expired" }, { status: 401 });
      }

      const refreshToken = getRefreshTokenFromCookies();
      if (!refreshToken) {
        clearAuthCookies();
        return Response.json({ error: "No refresh token" }, { status: 401 });
      }

      const tokens = await client.refresh(refreshToken);
      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(tokens, user);

      return Response.json({ user });
    } catch {
      clearAuthCookies();
      return Response.json({ error: "Refresh failed" }, { status: 401 });
    }
  }

  async function handleRegister(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const result = await client.register({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
      });

      if (!result.access_token) {
        return Response.json({
          needs_email_verification: true,
          user: result.user,
        });
      }

      const tokens = {
        access_token: result.access_token!,
        refresh_token: result.refresh_token!,
        token_type: result.token_type!,
        expires_in: result.expires_in!,
      };
      const user =
        (result.user as UserResource) ??
        (await client.getMe(tokens.access_token)).data;
      setAuthCookies(tokens, user, { isNewSession: true });

      return Response.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  async function handleForgotPassword(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const result = await client.forgotPassword(body.email);
      return Response.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  async function handleResetPassword(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const result = await client.resetPassword(body.token, body.password);
      return Response.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  async function handleVerifyEmail(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as Record<string, string>;
      const result = await client.verifyEmail(body.token);
      return Response.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  async function handleLogout(): Promise<Response> {
    try {
      const refreshToken = getRefreshTokenFromCookies();
      if (refreshToken) {
        await client.logout(refreshToken).catch(() => {});
      }
      clearAuthCookies();
      return Response.json({ success: true });
    } catch {
      clearAuthCookies();
      return Response.json({ success: true });
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
        case "forgot-password":
          return handleForgotPassword(request);
        case "reset-password":
          return handleResetPassword(request);
        case "verify-email":
          return handleVerifyEmail(request);
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return { handleRequest };
}
