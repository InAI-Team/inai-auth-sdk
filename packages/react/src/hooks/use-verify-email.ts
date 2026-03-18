"use client";

import { useState, useCallback } from "react";

type VerifyEmailStatus = "idle" | "loading" | "success" | "error";

export function useVerifyEmail() {
  const [status, setStatus] = useState<VerifyEmailStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === "loading";

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Request failed";
        setError(msg);
        setStatus("error");
        return { success: false, error: msg };
      }

      setStatus("success");
      return { success: true, message: data.message };
    } catch {
      const msg = "An unexpected error occurred";
      setError(msg);
      setStatus("error");
      return { success: false, error: msg };
    }
  }, []);

  return {
    verifyEmail,
    isLoading,
    error,
    status,
    reset,
  };
}
