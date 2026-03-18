import { Hono } from "hono";
import type { InAIAuthConfig } from "@inai-dev/types";
import { InAIAuthClient } from "@inai-dev/backend";
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromContext,
  getTokenFromContext,
  isSessionExpired,
} from "./helpers";

export function createPlatformAuthRoutes(config: InAIAuthConfig = {}) {
  const app = new Hono();
  const client = new InAIAuthClient(config);

  app.post("/login", async (c) => {
    try {
      const body = await c.req.json<Record<string, string>>();
      const result = await client.platformLogin({
        email: body.email,
        password: body.password,
      });

      if (result.mfa_required) {
        return c.json({ mfa_required: true, mfa_token: result.mfa_token });
      }

      const tokens = {
        access_token: result.access_token!,
        refresh_token: result.refresh_token!,
        token_type: result.token_type!,
        expires_in: result.expires_in!,
      };
      const user = result.user;
      setAuthCookies(c, tokens, user!, { isNewSession: true });

      return c.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return c.json({ error: message }, 401);
    }
  });

  app.post("/register", async (c) => {
    try {
      const body = await c.req.json<Record<string, string>>();
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
        setAuthCookies(c, tokens, result.user!, { isNewSession: true });
      }

      return c.json({ user: result.user, tenant: result.tenant });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      return c.json({ error: message }, 400);
    }
  });

  app.post("/mfa-challenge", async (c) => {
    try {
      const body = await c.req.json<Record<string, string>>();
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
      setAuthCookies(c, tokens, user!, { isNewSession: true });

      return c.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "MFA verification failed";
      return c.json({ error: message }, 401);
    }
  });

  app.post("/refresh", async (c) => {
    try {
      if (isSessionExpired(c)) {
        clearAuthCookies(c);
        return c.json({ error: "Session expired" }, 401);
      }

      const refreshToken = getRefreshTokenFromContext(c);

      if (!refreshToken) {
        clearAuthCookies(c);
        return c.json({ error: "No refresh token" }, 401);
      }

      const tokens = await client.platformRefresh(refreshToken);
      const { data: user } = await client.platformGetMe(tokens.access_token);
      setAuthCookies(c, tokens, user);

      return c.json({ user });
    } catch {
      clearAuthCookies(c);
      return c.json({ error: "Refresh failed" }, 401);
    }
  });

  app.post("/logout", async (c) => {
    try {
      const accessToken = getTokenFromContext(c);
      if (accessToken) {
        await client.platformLogout(accessToken).catch(() => {});
      }
      clearAuthCookies(c);
      return c.json({ success: true });
    } catch {
      clearAuthCookies(c);
      return c.json({ success: true });
    }
  });

  app.get("/me", async (c) => {
    try {
      const accessToken = getTokenFromContext(c);
      if (!accessToken) {
        return c.json({ error: "Not authenticated" }, 401);
      }
      const result = await client.platformGetMe(accessToken);
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get user";
      return c.json({ error: message }, 401);
    }
  });

  return app;
}
