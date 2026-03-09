"use client";

import { useState, useCallback } from "react";
import type { SignUpResult } from "@inai-dev/types";

type SignUpStatus = "idle" | "loading" | "needs_email_verification" | "complete" | "error";

export function useSignUp() {
  const [status, setStatus] = useState<SignUpStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === "loading";

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const create = useCallback(
    async (params: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }): Promise<SignUpResult> => {
      setStatus("loading");
      setError(null);

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await res.json();

        if (!res.ok) {
          const msg = data.error || "Registration failed";
          setError(msg);
          setStatus("error");
          return { status: "error", error: msg };
        }

        if (data.needs_email_verification) {
          setStatus("needs_email_verification");
          return {
            status: "needs_email_verification",
            user: data.user,
          };
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

  return {
    signUp: { create },
    isLoading,
    error,
    status,
    reset,
  };
}
