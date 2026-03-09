"use client";

import { useState, useCallback } from "react";
import type { SignInResult } from "@inai-dev/types";

type SignInStatus = "idle" | "loading" | "needs_mfa" | "complete" | "error";

export function useSignIn() {
  const [status, setStatus] = useState<SignInStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const isLoading = status === "loading";

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setMfaToken(null);
  }, []);

  const create = useCallback(
    async (params: {
      identifier: string;
      password: string;
    }): Promise<SignInResult> => {
      setStatus("loading");
      setError(null);

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: params.identifier,
            password: params.password,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          const msg = data.error || "Login failed";
          setError(msg);
          setStatus("error");
          return { status: "error", error: msg };
        }

        if (data.mfa_required) {
          setMfaToken(data.mfa_token);
          setStatus("needs_mfa");
          return { status: "needs_mfa", mfa_token: data.mfa_token };
        }

        setStatus("complete");
        return { status: "complete", user: data.user };
      } catch {
        const msg = "An unexpected error occurred";
        setError(msg);
        setStatus("error");
        return { status: "error", error: msg };
      }
    },
    [],
  );

  const attemptMFA = useCallback(
    async (params: { code: string }): Promise<SignInResult> => {
      if (!mfaToken) {
        setError("No MFA challenge in progress");
        return { status: "error", error: "No MFA challenge in progress" };
      }

      setStatus("loading");
      setError(null);

      try {
        const res = await fetch("/api/auth/mfa-challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mfa_token: mfaToken,
            code: params.code,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          const msg = data.error || "Invalid code";
          setError(msg);
          setStatus("needs_mfa");
          return { status: "needs_mfa", mfa_token: mfaToken };
        }

        setStatus("complete");
        setMfaToken(null);
        return { status: "complete", user: data.user };
      } catch {
        setError("An unexpected error occurred");
        setStatus("needs_mfa");
        return { status: "needs_mfa", mfa_token: mfaToken };
      }
    },
    [mfaToken],
  );

  return {
    signIn: { create, attemptMFA },
    isLoading,
    error,
    status,
    reset,
  };
}
