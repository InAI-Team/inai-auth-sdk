import { Router } from "express";
import type { Request, Response } from "express";
import type { InAIAuthConfig } from "@inai-dev/types";
import { InAIAuthClient } from "@inai-dev/backend";
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
} from "./helpers";

export function createAuthRoutes(config: InAIAuthConfig = {}): Router {
  const router = Router();
  const client = new InAIAuthClient(config);

  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as Record<string, string>;
      const result = await client.login({ email, password });

      if (result.mfa_required) {
        res.json({ mfa_required: true, mfa_token: result.mfa_token });
        return;
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const user =
        result.user ?? (await client.getMe(tokens.access_token)).data;
      setAuthCookies(res, tokens, user);

      res.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      res.status(401).json({ error: message });
    }
  });

  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body as Record<
        string,
        string
      >;
      const result = await client.register({
        email,
        password,
        firstName,
        lastName,
      });

      if (!result.access_token) {
        res.json({ needs_email_verification: true, user: result.user });
        return;
      }

      const tokens = { access_token: result.access_token!, refresh_token: result.refresh_token!, token_type: result.token_type!, expires_in: result.expires_in! };
      const user =
        result.user ?? (await client.getMe(tokens.access_token)).data;
      setAuthCookies(res, tokens, user);

      res.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      res.status(400).json({ error: message });
    }
  });

  router.post("/mfa-challenge", async (req: Request, res: Response) => {
    try {
      const { mfa_token, code } = req.body as Record<string, string>;
      const tokens = await client.mfaChallenge({ mfa_token, code });

      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(res, tokens, user);

      res.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "MFA verification failed";
      res.status(401).json({ error: message });
    }
  });

  router.post("/refresh", async (req: Request, res: Response) => {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);

      if (!refreshToken) {
        clearAuthCookies(res);
        res.status(401).json({ error: "No refresh token" });
        return;
      }

      const tokens = await client.refresh(refreshToken);
      const { data: user } = await client.getMe(tokens.access_token);
      setAuthCookies(res, tokens, user);

      res.json({ user });
    } catch {
      clearAuthCookies(res);
      res.status(401).json({ error: "Refresh failed" });
    }
  });

  router.post("/logout", async (req: Request, res: Response) => {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);
      if (refreshToken) {
        await client.logout(refreshToken).catch(() => {});
      }
      clearAuthCookies(res);
      res.json({ success: true });
    } catch {
      clearAuthCookies(res);
      res.json({ success: true });
    }
  });

  return router;
}
