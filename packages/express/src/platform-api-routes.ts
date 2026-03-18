import { Router } from "express";
import type { Request, Response } from "express";
import type { InAIAuthConfig } from "@inai-dev/types";
import { InAIAuthClient } from "@inai-dev/backend";
import {
  setAuthCookies,
  clearAuthCookies,
  getTokenFromRequest,
  getRefreshTokenFromRequest,
  isSessionExpired,
} from "./helpers";

export function createPlatformAuthRoutes(config: InAIAuthConfig = {}): Router {
  const router = Router();
  const client = new InAIAuthClient(config);

  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as Record<string, string>;
      const result = await client.platformLogin({ email, password });

      if (result.mfa_required) {
        res.json({ mfa_required: true, mfa_token: result.mfa_token });
        return;
      }

      const tokens = {
        access_token: result.access_token!,
        refresh_token: result.refresh_token!,
        token_type: result.token_type!,
        expires_in: result.expires_in!,
      };
      setAuthCookies(res, tokens, result.user!, { isNewSession: true });

      res.json({ user: result.user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      res.status(401).json({ error: message });
    }
  });

  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, tenantName, tenantSlug } = req.body as Record<string, string>;
      const result = await client.platformRegister({
        email,
        password,
        firstName,
        lastName,
        tenantName,
        tenantSlug,
      });

      if (result.access_token && result.refresh_token) {
        const tokens = {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          token_type: result.token_type!,
          expires_in: result.expires_in!,
        };
        setAuthCookies(res, tokens, result.user!, { isNewSession: true });
      }

      res.json({ user: result.user, tenant: result.tenant });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      res.status(400).json({ error: message });
    }
  });

  router.post("/mfa-challenge", async (req: Request, res: Response) => {
    try {
      const { mfa_token, code } = req.body as Record<string, string>;
      const result = await client.platformMfaChallenge({ mfa_token, code });

      const tokens = {
        access_token: result.access_token!,
        refresh_token: result.refresh_token!,
        token_type: result.token_type!,
        expires_in: result.expires_in!,
      };
      setAuthCookies(res, tokens, result.user!, { isNewSession: true });

      res.json({ user: result.user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "MFA verification failed";
      res.status(401).json({ error: message });
    }
  });

  router.post("/refresh", async (req: Request, res: Response) => {
    try {
      if (isSessionExpired(req)) {
        clearAuthCookies(res);
        res.status(401).json({ error: "Session expired" });
        return;
      }

      const refreshToken = getRefreshTokenFromRequest(req);

      if (!refreshToken) {
        clearAuthCookies(res);
        res.status(401).json({ error: "No refresh token" });
        return;
      }

      const tokens = await client.platformRefresh(refreshToken);
      const { data: user } = await client.platformGetMe(tokens.access_token);
      setAuthCookies(res, tokens, user);

      res.json({ user });
    } catch {
      clearAuthCookies(res);
      res.status(401).json({ error: "Refresh failed" });
    }
  });

  router.post("/logout", async (req: Request, res: Response) => {
    try {
      const accessToken = getTokenFromRequest(req);
      if (accessToken) {
        await client.platformLogout(accessToken).catch(() => {});
      }
      clearAuthCookies(res);
      res.json({ success: true });
    } catch {
      clearAuthCookies(res);
      res.json({ success: true });
    }
  });

  router.get("/me", async (req: Request, res: Response) => {
    try {
      const accessToken = getTokenFromRequest(req);
      if (!accessToken) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const result = await client.platformGetMe(accessToken);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get user";
      res.status(401).json({ error: message });
    }
  });

  return router;
}
