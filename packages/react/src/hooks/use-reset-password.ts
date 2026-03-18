"use client";

import { useState, useCallback } from "react";

type ResetPasswordStatus = "idle" | "loading" | "success" | "error";

export function useResetPassword() {
  const [status, setStatus] = useState<ResetPasswordStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === "loading";

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const resetPassword = useCallback(
    async (params: { token: string; password: string }) => {
      setStatus("loading");
      setError(null);

      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: params.token,
            password: params.password,
          }),
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
    },
    [],
  );

  return {
    resetPassword,
    isLoading,
    error,
    status,
    reset,
  };
}
