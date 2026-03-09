"use client";

import { useState, type FormEvent } from "react";

interface SignInProps {
  onMFARequired?: (mfaToken: string) => void;
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function SignIn({ onMFARequired, onSuccess, redirectUrl }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.mfa_required) {
        setMfaToken(data.mfa_token);
        onMFARequired?.(data.mfa_token);
        return;
      }

      onSuccess?.();
      if (redirectUrl) window.location.href = redirectUrl;
      else window.location.reload();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleMFA(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/mfa-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfa_token: mfaToken, code: mfaCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }

      onSuccess?.();
      if (redirectUrl) window.location.href = redirectUrl;
      else window.location.reload();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (mfaToken) {
    return (
      <form onSubmit={handleMFA}>
        <div>
          <label htmlFor="inai-mfa-code">Enter your 6-digit code</label>
          <input
            id="inai-mfa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <div role="alert">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      <div>
        <label htmlFor="inai-email">Email</label>
        <input
          id="inai-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label htmlFor="inai-password">Password</label>
        <input
          id="inai-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      {error && <div role="alert">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
