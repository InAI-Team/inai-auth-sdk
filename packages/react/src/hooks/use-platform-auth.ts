"use client";

import { useState, useCallback } from "react";
import type { PlatformUserResource } from "@inai-dev/types";

type PlatformAuthStatus = "idle" | "loading" | "needs_mfa" | "complete" | "error";

export function usePlatformAuth(options?: { basePath?: string }) {
  const basePath = options?.basePath ?? "/api/platform-auth";
  const [status, setStatus] = useState<PlatformAuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<PlatformUserResource | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const isLoading = status === "loading";

  const login = useCallback(
    async (params: { email: string; password: string }) => {
      setStatus("loading");
      setError(null);

      try {
        const res = await fetch(`${basePath}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Login failed");
          setStatus("error");
          return;
        }

        if (data.mfa_required) {
          setMfaToken(data.mfa_token);
          setStatus("needs_mfa");
          return;
        }

        setUser(data.user);
        setStatus("complete");
      } catch {
        setError("An unexpected error occurred");
        setStatus("error");
      }
    },
    [basePath],
  );

  const verifyMfa = useCallback(
    async (code: string) => {
      if (!mfaToken) {
        setError("No MFA challenge in progress");
        return;
      }

      setStatus("loading");
      setError(null);

      try {
        const res = await fetch(`${basePath}/mfa-challenge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mfa_token: mfaToken, code }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid code");
          setStatus("needs_mfa");
          return;
        }

        setUser(data.user);
        setMfaToken(null);
        setStatus("complete");
      } catch {
        setError("An unexpected error occurred");
        setStatus("needs_mfa");
      }
    },
    [basePath, mfaToken],
  );

  const logout = useCallback(async () => {
    await fetch(`${basePath}/logout`, { method: "POST" }).catch(() => {});
    setUser(null);
    setStatus("idle");
  }, [basePath]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/refresh`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // Refresh failed silently
    }
  }, [basePath]);

  const getMe = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/me`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
        return data.data as PlatformUserResource;
      }
    } catch {
      // Failed silently
    }
    return null;
  }, [basePath]);

  return {
    user,
    status,
    error,
    isLoading,
    mfaToken,
    login,
    verifyMfa,
    logout,
    refresh,
    getMe,
  };
}
