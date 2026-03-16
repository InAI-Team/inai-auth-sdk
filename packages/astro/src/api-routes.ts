import type { InAIAuthConfig, TokenPair, UserResource, LoginResult } from "@inai-dev/types";
import { InAIAuthClient } from "@inai-dev/backend";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_S,
  SESSION_MAX_DURATION_MS,
  decodeJWTPayload,
} from "@inai-dev/shared";

interface AstroCookies {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string, options?: Record<string, unknown>): void;
}

interface AstroAPIContext {
  request: Request;
  cookies: AstroCookies;
  params: Record<string, string | undefined>;
  url: URL;
}

function setAuthCookies(
  cookies: AstroCookies,
  tokens: TokenPair,
  user: UserResource,
  options?: { isNewSession?: boolean },
): void {
  const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  const claims = decodeJWTPayload(tokens.access_token);
  const expiresAt = claims
    ? claims.exp * 1000
    : Date.now() + tokens.expires_in * 1000;

  cookies.set(COOKIE_AUTH_TOKEN, tokens.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });

  cookies.set(COOKIE_REFRESH_TOKEN, tokens.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  cookies.set(COOKIE_AUTH_SESSION, JSON.stringify({
    user,
    expiresAt,
    permissions: claims?.permissions ?? [],
    orgId: claims?.org_id,
    orgRole: claims?.org_role,
    appId: claims?.app_id,
    envId: claims?.env_id,
  }), {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  if (options?.isNewSession) {
    cookies.set(COOKIE_SESSION_START, String(Date.now()), {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_DURATION_S,
    });
  }
}

function clearAuthCookies(cookies: AstroCookies): void {
  cookies.delete(COOKIE_AUTH_TOKEN, { path: "/" });
  cookies.delete(COOKIE_REFRESH_TOKEN, { path: "/" });
  cookies.delete(COOKIE_AUTH_SESSION, { path: "/" });
  cookies.delete(COOKIE_SESSION_START, { path: "/" });
}

function isSessionExpired(cookies: AstroCookies): boolean {
  const raw = cookies.get(COOKIE_SESSION_START)?.value;
  if (!raw) return false;
  const loginAt = Number(raw);
  if (isNaN(loginAt)) return true;
  return Date.now() - loginAt >= SESSION_MAX_DURATION_MS;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createAuthRoutes(config: InAIAuthConfig = {}) {
  const client = new InAIAuthClient(config);

  async function handleLogin(context: AstroAPIContext): Promise<Response> {
    try {
      const body = await context.request.json() as Record<string, string>;
      const result = await client.login({
        email: body.email,
        password: body.password,
      });

      if (result.mfa_required) {
        return jsonResponse({
          mfa_required: true,
          mfa_token: result.mfa_token,
        });
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const loginUser = result.user;
      const user = loginUser ?? (await client.getMe(tokens.access_token)).data;
      setAuthCookies(context.cookies, tokens, user, { isNewSession: true });

      return jsonResponse({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return jsonResponse({ error: message }, 401);
    }
  }

  async function handleRegister(context: AstroAPIContext): Promise<Response> {
    try {
      const body = await context.request.json() as Record<string, string>;
      const result = await client.register({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
      });

      if (!result.access_token) {
        return jsonResponse({
          needs_email_verification: true,
          user: result.user,
        });
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const loginUser = result.user;
      const user = loginUser ?? (await client.getMe(tokens.access_token)).data;
      setAuthCookies(context.cookies, tokens, user, { isNewSession: true });

      return jsonResponse({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  async function handleMFAChallenge(context: AstroAPIContext): Promise<Response> {
    try {
      const body = await context.request.json() as Record<string, string>;
      const tokens = await client.mfaChallenge({
        mfa_token: body.mfa_token,
        code: body.code,
      });

      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(context.cookies, tokens, user, { isNewSession: true });

      return jsonResponse({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "MFA verification failed";
      return jsonResponse({ error: message }, 401);
    }
  }

  async function handleRefresh(context: AstroAPIContext): Promise<Response> {
    try {
      if (isSessionExpired(context.cookies)) {
        clearAuthCookies(context.cookies);
        return jsonResponse({ error: "Session expired" }, 401);
      }

      const refreshToken = context.cookies.get(COOKIE_REFRESH_TOKEN)?.value;

      if (!refreshToken) {
        clearAuthCookies(context.cookies);
        return jsonResponse({ error: "No refresh token" }, 401);
      }

      const tokens = await client.refresh(refreshToken);
      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(context.cookies, tokens, user);

      return jsonResponse({ user });
    } catch {
      clearAuthCookies(context.cookies);
      return jsonResponse({ error: "Refresh failed" }, 401);
    }
  }

  async function handleLogout(context: AstroAPIContext): Promise<Response> {
    try {
      const refreshToken = context.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
      if (refreshToken) {
        await client.logout(refreshToken).catch(() => {});
      }
      clearAuthCookies(context.cookies);
      return jsonResponse({ success: true });
    } catch {
      clearAuthCookies(context.cookies);
      return jsonResponse({ success: true });
    }
  }

  async function handler(context: AstroAPIContext): Promise<Response> {
    const path = context.params.path ?? "";

    if (context.request.method === "POST") {
      switch (path) {
        case "login":
          return handleLogin(context);
        case "register":
          return handleRegister(context);
        case "mfa-challenge":
          return handleMFAChallenge(context);
        case "refresh":
          return handleRefresh(context);
        case "logout":
          return handleLogout(context);
      }
    }

    return jsonResponse({ error: "Not found" }, 404);
  }

  return {
    ALL: handler,
    POST: handler,
    GET: handler,
  };
}

export { setAuthCookies, clearAuthCookies };
export type { AstroCookies, AstroAPIContext };
