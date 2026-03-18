"use client";

import { useState, useCallback } from "react";

type ForgotPasswordStatus = "idle" | "loading" | "success" | "error";

export function useForgotPassword() {
  const [status, setStatus] = useState<ForgotPasswordStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === "loading";

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    forgotPassword,
    isLoading,
    error,
    status,
    reset,
  };
}
