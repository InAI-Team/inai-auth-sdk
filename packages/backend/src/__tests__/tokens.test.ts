import { describe, it, expect, vi, beforeAll } from "vitest";
import { buildAuthObjectFromToken, buildAuthObjectFromClaims } from "../tokens";
import { JWKSClient } from "@inai-dev/shared";

// We'll test buildAuthObjectFromToken with a mock JWKSClient
// and buildAuthObjectFromClaims directly (it doesn't need crypto)

describe("buildAuthObjectFromToken", () => {
  it("returns null for garbage token (no kid in header)", async () => {
    const mockClient = { getKey: vi.fn(), invalidate: vi.fn() } as unknown as JWKSClient;
    const result = await buildAuthObjectFromToken("garbage", mockClient);
    expect(result).toBeNull();
    expect(mockClient.getKey).not.toHaveBeenCalled();
  });

  it("returns null when kid not found in JWKS", async () => {
    const header = btoa(JSON.stringify({ alg: "ES256", kid: "unknown-kid", typ: "JWT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const payload = btoa(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const token = `${header}.${payload}.fake-sig`;

    const mockClient = {
      getKey: vi.fn().mockRejectedValue(new Error("Unknown key")),
      invalidate: vi.fn(),
    } as unknown as JWKSClient;

    const result = await buildAuthObjectFromToken(token, mockClient);
    expect(result).toBeNull();
  });
});

describe("buildAuthObjectFromClaims", () => {
  it("has() uses OR logic for role and permission", () => {
    const claims = {
      sub: "user_1",
      tenant_id: "t_1",
      type: "app_user" as const,
      email: "test@test.com",
      roles: ["admin"],
      permissions: ["read"],
      iat: 0,
      exp: 9999999999,
    };
    const auth = buildAuthObjectFromClaims(claims, "token");

    // OR logic: returns true if EITHER matches
    expect(auth.has({ role: "admin" })).toBe(true);
    expect(auth.has({ permission: "read" })).toBe(true);
    expect(auth.has({ role: "user" })).toBe(false);
    expect(auth.has({ permission: "write" })).toBe(false);

    // When both provided, OR logic: true if either matches
    expect(auth.has({ role: "admin", permission: "write" })).toBe(true);
    expect(auth.has({ role: "user", permission: "read" })).toBe(true);
    expect(auth.has({ role: "user", permission: "write" })).toBe(false);
  });

  it("getToken returns the token", async () => {
    const claims = {
      sub: "user_1",
      tenant_id: "t_1",
      type: "app_user" as const,
      email: "test@test.com",
      roles: [],
      permissions: [],
      iat: 0,
      exp: 9999999999,
    };
    const auth = buildAuthObjectFromClaims(claims, "my-token");
    expect(await auth.getToken()).toBe("my-token");
  });

  it("handles missing optional fields", () => {
    const claims = {
      sub: "user_1",
      tenant_id: "t_1",
      type: "app_user" as const,
      email: "test@test.com",
      roles: [],
      permissions: [],
      iat: 0,
      exp: 9999999999,
    };
    const auth = buildAuthObjectFromClaims(claims, "token");
    expect(auth.orgId).toBeNull();
    expect(auth.orgRole).toBeNull();
    expect(auth.appId).toBeNull();
    expect(auth.envId).toBeNull();
  });
});
