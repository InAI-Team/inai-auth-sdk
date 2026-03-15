import { Hono } from "hono";
import type { InAIAuthConfig, TokenPair, UserResource, LoginResult } from "@inai-dev/types";
import { InAIAuthClient } from "@inai-dev/backend";
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromContext,
} from "./helpers";

export function createAuthRoutes(config: InAIAuthConfig = {}) {
  const app = new Hono();
  const client = new InAIAuthClient(config);

  app.post("/login", async (c) => {
    try {
      const body = await c.req.json<Record<string, string>>();
      const result = await client.login({
        email: body.email,
        password: body.password,
      });

      if (result.mfa_required) {
        return c.json({ mfa_required: true, mfa_token: result.mfa_token });
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const user =
        result.user ?? (await client.getMe(tokens.access_token)).data;
      setAuthCookies(c, tokens, user);

      return c.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return c.json({ error: message }, 401);
    }
  });

  app.post("/register", async (c) => {
    try {
      const body = await c.req.json<Record<string, string>>();
      const result = await client.register({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
      });

      if (!result.access_token) {
        return c.json({ needs_email_verification: true, user: result.user });
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const user =
        result.user ?? (await client.getMe(tokens.access_token)).data;
      setAuthCookies(c, tokens, user);

      return c.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      return c.json({ error: message }, 400);
    }
  });

  app.post("/mfa-challenge", async (c) => {
    try {
      const body = await c.req.json<Record<string, string>>();
      const tokens = await client.mfaChallenge({
        mfa_token: body.mfa_token,
        code: body.code,
      });

      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(c, tokens, user);

      return c.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "MFA verification failed";
      return c.json({ error: message }, 401);
    }
  });

  app.post("/refresh", async (c) => {
    try {
      const refreshToken = getRefreshTokenFromContext(c);

      if (!refreshToken) {
        clearAuthCookies(c);
        return c.json({ error: "No refresh token" }, 401);
      }

      const tokens = await client.refresh(refreshToken);
      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(c, tokens, user);

      return c.json({ user });
    } catch {
      clearAuthCookies(c);
      return c.json({ error: "Refresh failed" }, 401);
    }
  });

  app.post("/logout", async (c) => {
    try {
      const refreshToken = getRefreshTokenFromContext(c);
      if (refreshToken) {
        await client.logout(refreshToken).catch(() => {});
      }
      clearAuthCookies(c);
      return c.json({ success: true });
    } catch {
      clearAuthCookies(c);
      return c.json({ success: true });
    }
  });

  return app;
}
