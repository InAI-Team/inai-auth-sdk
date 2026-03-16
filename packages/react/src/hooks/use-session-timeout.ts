"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_MS,
  SESSION_WARNING_BEFORE_MS,
} from "@inai-dev/shared";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

interface UseSessionTimeoutOptions {
  warningBeforeMs?: number;
  sessionMaxDurationMs?: number;
}

interface UseSessionTimeoutReturn {
  showWarning: boolean;
  secondsLeft: number;
  handleLogout: () => Promise<void>;
}

export function useSessionTimeout(
  options?: UseSessionTimeoutOptions,
): UseSessionTimeoutReturn {
  const warningBeforeMs = options?.warningBeforeMs ?? SESSION_WARNING_BEFORE_MS;
  const maxDurationMs = options?.sessionMaxDurationMs ?? SESSION_MAX_DURATION_MS;

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    clearCountdown();
    setShowWarning(false);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }, [clearCountdown]);

  useEffect(() => {
    const check = () => {
      const raw = getCookie(COOKIE_SESSION_START);
      if (!raw) return;
      const loginAt = Number(raw);
      if (isNaN(loginAt)) return;

      const deadline = loginAt + maxDurationMs;
      const msLeft = deadline - Date.now();

      if (msLeft <= 0) {
        handleLogout();
        return;
      }

      if (msLeft <= warningBeforeMs && !showWarning) {
        setShowWarning(true);
        setSecondsLeft(Math.floor(msLeft / 1000));
        clearCountdown();
        countdownRef.current = setInterval(() => {
          const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
          setSecondsLeft(remaining);
          if (remaining <= 0) {
            clearCountdown();
            setShowWarning(false);
            handleLogout();
          }
        }, 1000);
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      clearInterval(interval);
      clearCountdown();
    };
  }, [showWarning, warningBeforeMs, maxDurationMs, clearCountdown, handleLogout]);

  return { showWarning, secondsLeft, handleLogout };
}
