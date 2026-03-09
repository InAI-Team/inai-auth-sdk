import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InAIAuthClient } from "../client";
import { InAIAuthError } from "@inai-dev/shared";

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers(),
  });
}

describe("InAIAuthClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("creates client with config", () => {
    const client = new InAIAuthClient({
      apiUrl: "https://auth.example.com",
      publishableKey: "pk_test_123",
    });
    expect(client).toBeInstanceOf(InAIAuthClient);
  });

  describe("login", () => {
    it("sends correct request and returns tokens", async () => {
      const tokens = {
        access_token: "at_123",
        refresh_token: "rt_123",
        token_type: "Bearer",
        expires_in: 3600,
      };
      globalThis.fetch = mockFetch(tokens);

      const client = new InAIAuthClient({
        apiUrl: "https://auth.example.com",
        publishableKey: "pk_test_123",
      });
      const result = await client.login({ email: "user@test.com", password: "pass" });

      expect(result).toEqual(tokens);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://auth.example.com/api/v1/auth/login",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Publishable-Key": "pk_test_123",
          }),
        }),
      );
    });

    it("returns MFA challenge when required", async () => {
      const mfaResult = { mfa_required: true, mfa_token: "mfa_123" };
      globalThis.fetch = mockFetch(mfaResult);

      const client = new InAIAuthClient({
        apiUrl: "https://auth.example.com",
        publishableKey: "pk_test_123",
      });
      const result = await client.login({ email: "user@test.com", password: "pass" });

      expect(result.mfa_required).toBe(true);
      expect(result.mfa_token).toBe("mfa_123");
    });

    it("throws InAIAuthError on failure", async () => {
      globalThis.fetch = mockFetch(
        { code: "INVALID_CREDENTIALS", detail: "Invalid email or password" },
        401,
      );

      const client = new InAIAuthClient({
        apiUrl: "https://auth.example.com",
        publishableKey: "pk_test_123",
      });

      await expect(client.login({ email: "user@test.com", password: "wrong" }))
        .rejects.toThrow(InAIAuthError);
    });
  });

  describe("getMe", () => {
    it("sends bearer token and returns user", async () => {
      const user = {
        data: {
          id: "u_1",
          email: "user@test.com",
          tenantId: "t_1",
          firstName: null,
          lastName: null,
          avatarUrl: null,
          isActive: true,
          emailVerified: true,
          mfaEnabled: false,
          externalId: null,
          roles: [],
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      };
      globalThis.fetch = mockFetch(user);

      const client = new InAIAuthClient({
        apiUrl: "https://auth.example.com",
        publishableKey: "pk_test_123",
      });
      const result = await client.getMe("at_123");

      expect(result.data.id).toBe("u_1");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://auth.example.com/api/v1/auth/me",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer at_123",
          }),
        }),
      );
    });
  });

  describe("refresh", () => {
    it("sends refresh token and returns new tokens", async () => {
      const tokens = {
        access_token: "at_new",
        refresh_token: "rt_new",
        token_type: "Bearer",
        expires_in: 3600,
      };
      globalThis.fetch = mockFetch(tokens);

      const client = new InAIAuthClient({
        apiUrl: "https://auth.example.com",
        publishableKey: "pk_test_123",
      });
      const result = await client.refresh("rt_old");

      expect(result.access_token).toBe("at_new");
    });
  });

  describe("platform methods", () => {
    it("platformLogin calls correct endpoint", async () => {
      const result = { access_token: "at_1", refresh_token: "rt_1", token_type: "Bearer", expires_in: 3600 };
      globalThis.fetch = mockFetch(result);

      const client = new InAIAuthClient({ apiUrl: "https://auth.example.com" });
      await client.platformLogin({ email: "admin@test.com", password: "pass" });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://auth.example.com/api/platform/auth/login",
        expect.any(Object),
      );
    });
  });

  describe("URL normalization", () => {
    it("strips trailing slash from apiUrl", async () => {
      globalThis.fetch = mockFetch({ data: [] });

      const client = new InAIAuthClient({ apiUrl: "https://auth.example.com/" });
      await client.listApplications("token");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://auth.example.com/api/platform/applications",
        expect.any(Object),
      );
    });
  });

  describe("publishable key header", () => {
    it("includes X-Publishable-Key for /api/v1/ routes", async () => {
      globalThis.fetch = mockFetch({});

      const client = new InAIAuthClient({
        apiUrl: "https://auth.example.com",
        publishableKey: "pk_test_key",
      });
      await client.login({ email: "a@b.c", password: "p" });

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].headers["X-Publishable-Key"]).toBe("pk_test_key");
    });

    it("does not include X-Publishable-Key for platform routes", async () => {
      globalThis.fetch = mockFetch({});

      const client = new InAIAuthClient({
        apiUrl: "https://auth.example.com",
        publishableKey: "pk_test_key",
      });
      await client.platformLogin({ email: "a@b.c", password: "p" });

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].headers["X-Publishable-Key"]).toBeUndefined();
    });
  });
});
