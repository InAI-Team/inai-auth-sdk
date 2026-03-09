// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSignIn } from "../hooks/use-sign-in";
import { useSignUp } from "../hooks/use-sign-up";

describe("useSignIn", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("starts with idle status", () => {
    const { result } = renderHook(() => useSignIn());
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("returns error status on failed login", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Invalid credentials" }),
    });

    const { result } = renderHook(() => useSignIn());

    let signInResult: Awaited<ReturnType<typeof result.current.signIn.create>>;
    await act(async () => {
      signInResult = await result.current.signIn.create({
        identifier: "user@test.com",
        password: "wrong",
      });
    });

    expect(signInResult!.status).toBe("error");
    expect(signInResult!.error).toBe("Invalid credentials");
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Invalid credentials");
  });

  it("returns complete status on successful login", async () => {
    const user = { id: "u_1", email: "user@test.com" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user }),
    });

    const { result } = renderHook(() => useSignIn());

    let signInResult: Awaited<ReturnType<typeof result.current.signIn.create>>;
    await act(async () => {
      signInResult = await result.current.signIn.create({
        identifier: "user@test.com",
        password: "correct",
      });
    });

    expect(signInResult!.status).toBe("complete");
    expect(signInResult!.user).toEqual(user);
    expect(result.current.status).toBe("complete");
  });

  it("handles MFA challenge", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mfa_required: true, mfa_token: "mfa_123" }),
    });

    const { result } = renderHook(() => useSignIn());

    let signInResult: Awaited<ReturnType<typeof result.current.signIn.create>>;
    await act(async () => {
      signInResult = await result.current.signIn.create({
        identifier: "user@test.com",
        password: "pass",
      });
    });

    expect(signInResult!.status).toBe("needs_mfa");
    expect(signInResult!.mfa_token).toBe("mfa_123");
    expect(result.current.status).toBe("needs_mfa");
  });

  it("returns error on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSignIn());

    let signInResult: Awaited<ReturnType<typeof result.current.signIn.create>>;
    await act(async () => {
      signInResult = await result.current.signIn.create({
        identifier: "user@test.com",
        password: "pass",
      });
    });

    expect(signInResult!.status).toBe("error");
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("An unexpected error occurred");
  });

  it("reset clears error state", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed" }),
    });

    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signIn.create({
        identifier: "user@test.com",
        password: "wrong",
      });
    });

    expect(result.current.status).toBe("error");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("attemptMFA returns error when no MFA challenge in progress", async () => {
    const { result } = renderHook(() => useSignIn());

    let mfaResult: Awaited<ReturnType<typeof result.current.signIn.attemptMFA>>;
    await act(async () => {
      mfaResult = await result.current.signIn.attemptMFA({ code: "123456" });
    });

    expect(mfaResult!.status).toBe("error");
    expect(result.current.error).toBe("No MFA challenge in progress");
  });
});

describe("useSignUp", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("starts with idle status", () => {
    const { result } = renderHook(() => useSignUp());
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("returns error status on failed registration", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Email taken" }),
    });

    const { result } = renderHook(() => useSignUp());

    let signUpResult: Awaited<ReturnType<typeof result.current.signUp.create>>;
    await act(async () => {
      signUpResult = await result.current.signUp.create({
        email: "user@test.com",
        password: "pass",
      });
    });

    expect(signUpResult!.status).toBe("error");
    expect(signUpResult!.error).toBe("Email taken");
    expect(result.current.status).toBe("error");
  });

  it("returns complete on successful registration", async () => {
    const user = { id: "u_1", email: "new@test.com" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user }),
    });

    const { result } = renderHook(() => useSignUp());

    let signUpResult: Awaited<ReturnType<typeof result.current.signUp.create>>;
    await act(async () => {
      signUpResult = await result.current.signUp.create({
        email: "new@test.com",
        password: "StrongPass1",
      });
    });

    expect(signUpResult!.status).toBe("complete");
    expect(result.current.status).toBe("complete");
  });

  it("handles email verification required", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ needs_email_verification: true, user: { id: "u_1" } }),
    });

    const { result } = renderHook(() => useSignUp());

    let signUpResult: Awaited<ReturnType<typeof result.current.signUp.create>>;
    await act(async () => {
      signUpResult = await result.current.signUp.create({
        email: "new@test.com",
        password: "StrongPass1",
      });
    });

    expect(signUpResult!.status).toBe("needs_email_verification");
    expect(result.current.status).toBe("needs_email_verification");
  });
});
