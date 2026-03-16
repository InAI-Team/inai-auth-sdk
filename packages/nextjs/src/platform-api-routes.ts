import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { InAIAuthClient } from "@inai-dev/backend";
import type { InAIAuthConfig, TokenPair, PlatformUserResource } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_REFRESH_TOKEN,
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_S,
} from "@inai-dev/shared";
import { isSessionExpired } from "./cookies";

export function createPlatformAuthRoutes(config: InAIAuthConfig = {}) {
  const client = new InAIAuthClient(config);
  const isProduction = process.env.NODE_ENV === "production";

  function setPlatformCookies(
    cookieStore: Awaited<ReturnType<typeof cookies>>,
    tokens: TokenPair,
    user?: PlatformUserResource,
    options?: { isNewSession?: boolean },
  ) {
    cookieStore.set(COOKIE_AUTH_TOKEN, tokens.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in,
    });
    cookieStore.set(COOKIE_REFRESH_TOKEN, tokens.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    if (user) {
      const expiresAt = Date.now() + tokens.expires_in * 1000;
      cookieStore.set(
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
      cookieStore.set(COOKIE_SESSION_START, String(Date.now()), {
        httpOnly: false,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_DURATION_S,
      });
    }
  }

  function clearPlatformCookies(
    cookieStore: Awaited<ReturnType<typeof cookies>>,
  ) {
    cookieStore.set(COOKIE_AUTH_TOKEN, "", { path: "/", maxAge: 0 });
    cookieStore.set(COOKIE_REFRESH_TOKEN, "", {
      path: "/",
      maxAge: 0,
    });
    cookieStore.set(COOKIE_AUTH_SESSION, "", { path: "/", maxAge: 0 });
    cookieStore.set(COOKIE_SESSION_START, "", { path: "/", maxAge: 0 });
  }

  async function handleLogin(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, string>;
      const result = await client.platformLogin({
        email: body.email,
        password: body.password,
      });

      if (result.mfa_required) {
        return NextResponse.json({
          mfa_required: true,
          mfa_token: result.mfa_token,
        });
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const user = result.user;
      const cookieStore = await cookies();
      setPlatformCookies(cookieStore, tokens, user, { isNewSession: true });

      return NextResponse.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return NextResponse.json({ error: message }, { status: 401 });
    }
  }

  async function handleMFAChallenge(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, string>;
      const result = await client.platformMfaChallenge({
        mfa_token: body.mfa_token,
        code: body.code,
      });

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const user = result.user;
      const cookieStore = await cookies();
      setPlatformCookies(cookieStore, tokens, user, { isNewSession: true });

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

      // Check absolute session max
      if (isSessionExpired(cookieStore)) {
        clearPlatformCookies(cookieStore);
        return NextResponse.json(
          { error: "Session expired" },
          { status: 401 },
        );
      }

      const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

      if (!refreshToken) {
        clearPlatformCookies(cookieStore);
        return NextResponse.json(
          { error: "No refresh token" },
          { status: 401 },
        );
      }

      const tokens = await client.platformRefresh(refreshToken);
      const { data: user } = await client.platformGetMe(
        tokens.access_token,
      );
      setPlatformCookies(cookieStore, tokens, user);

      return NextResponse.json({ user });
    } catch {
      const cookieStore = await cookies();
      clearPlatformCookies(cookieStore);
      return NextResponse.json(
        { error: "Refresh failed" },
        { status: 401 },
      );
    }
  }

  async function handleLogout() {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get(COOKIE_AUTH_TOKEN)?.value;
      if (accessToken) {
        await client.platformLogout(accessToken).catch(() => {});
      }
      clearPlatformCookies(cookieStore);
      return NextResponse.json({ success: true });
    } catch {
      const cookieStore = await cookies();
      clearPlatformCookies(cookieStore);
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
        case "mfa-challenge":
          return handleMFAChallenge(req);
        case "refresh":
          return handleRefresh();
        case "logout":
          return handleLogout();
      }
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return {
    GET: handler,
    POST: handler,
  };
}
