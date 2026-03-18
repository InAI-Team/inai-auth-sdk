import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { InAIAuthClient } from "@inai-dev/backend";
import type {
  InAIAuthConfig,
  TokenPair,
  UserResource,
  LoginResult,
} from "@inai-dev/types";
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromCookies,
  isSessionExpired,
} from "./cookies";

export function createAuthRoutes(config: InAIAuthConfig = {}) {
  const client = new InAIAuthClient(config);

  async function handleLogin(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, string>;
      const result = (await client.login({
        email: body.email,
        password: body.password,
      }));

      if (result.mfa_required) {
        return NextResponse.json({
          mfa_required: true,
          mfa_token: result.mfa_token,
        });
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const user =
        result.user as UserResource ?? (await client.getMe(tokens.access_token)).data;
      const cookieStore = await cookies();
      setAuthCookies(cookieStore, tokens, user, { isNewSession: true });

      return NextResponse.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return NextResponse.json({ error: message }, { status: 401 });
    }
  }

  async function handleMFAChallenge(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, string>;
      const tokens = await client.mfaChallenge({
        mfa_token: body.mfa_token,
        code: body.code,
      });

      const { data: user } = await client.getMe(tokens.access_token);
      const cookieStore = await cookies();
      setAuthCookies(cookieStore, tokens, user, { isNewSession: true });

      return NextResponse.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "MFA verification failed";
      return NextResponse.json({ error: message }, { status: 401 });
    }
  }

  async function handleRefresh() {
    try {
      const cookieStore = await cookies();

      if (isSessionExpired(cookieStore)) {
        clearAuthCookies(cookieStore);
        return NextResponse.json(
          { error: "Session expired" },
          { status: 401 },
        );
      }

      const refreshToken = getRefreshTokenFromCookies(cookieStore);

      if (!refreshToken) {
        clearAuthCookies(cookieStore);
        return NextResponse.json(
          { error: "No refresh token" },
          { status: 401 },
        );
      }

      const tokens = await client.refresh(refreshToken);
      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(cookieStore, tokens, user);

      return NextResponse.json({ user });
    } catch {
      const cookieStore = await cookies();
      clearAuthCookies(cookieStore);
      return NextResponse.json(
        { error: "Refresh failed" },
        { status: 401 },
      );
    }
  }

  async function handleRegister(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, string>;
      const result = await client.register({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
      });

      if (!result.access_token) {
        return NextResponse.json({
          needs_email_verification: true,
          user: result.user,
        });
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const user =
        result.user as UserResource ?? (await client.getMe(tokens.access_token)).data;
      const cookieStore = await cookies();
      setAuthCookies(cookieStore, tokens, user, { isNewSession: true });

      return NextResponse.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  async function handleForgotPassword(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, string>;
      const result = await client.forgotPassword(body.email);
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  async function handleResetPassword(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, string>;
      const result = await client.resetPassword(body.token, body.password);
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  async function handleVerifyEmail(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, string>;
      const result = await client.verifyEmail(body.token);
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  async function handleLogout() {
    try {
      const cookieStore = await cookies();
      const refreshToken = getRefreshTokenFromCookies(cookieStore);
      if (refreshToken) {
        await client.logout(refreshToken).catch(() => {});
      }
      clearAuthCookies(cookieStore);
      return NextResponse.json({ success: true });
    } catch {
      const cookieStore = await cookies();
      clearAuthCookies(cookieStore);
      return NextResponse.json({ success: true });
    }
  }

  async function handler(
    req: NextRequest,
    context: { params: Promise<{ inai: string[] }> },
  ) {
    const params = await context.params;
    const path = params.inai?.join("/") ?? "";

    if (req.method === "POST") {
      switch (path) {
        case "login":
          return handleLogin(req);
        case "register":
          return handleRegister(req);
        case "mfa-challenge":
          return handleMFAChallenge(req);
        case "refresh":
          return handleRefresh();
        case "logout":
          return handleLogout();
        case "forgot-password":
          return handleForgotPassword(req);
        case "reset-password":
          return handleResetPassword(req);
        case "verify-email":
          return handleVerifyEmail(req);
      }
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return {
    GET: handler,
    POST: handler,
  };
}
